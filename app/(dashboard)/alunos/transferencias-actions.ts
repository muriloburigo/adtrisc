'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff, type Actor } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import { ladoQueResponde } from '@/lib/transferencias'

// Transferência de atletas entre turmas.
// - Quem tem acesso às DUAS turmas (titular ou auxiliar — mesmas permissões —
//   ou admin) muda direto.
// - Senão vira pedido: o treinador da origem "envia" (o destino aceita) ou o
//   da turma de destino "solicita" (a origem aceita).
// Tudo com service role, mas autorizado aqui dentro, turma a turma: o
// treinador continua sem enxergar atletas de outras turmas pela RLS.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
type Aluno = { id: string; nome: string; status: string; turma_id: string | null }
type Turma = { id: string; nome: string; status: string }

async function contexto() {
  const actor = await requireStaff()
  const admin = createAdminClient() as Db
  const { data: perfil } = await admin.from('profiles').select('role').eq('id', actor.id).single()
  const ehAdmin = perfil?.role === 'admin'
  const minhas = ehAdmin ? null : new Set(await getTurmaIdsForCoach(admin, actor.id))
  const acesso = (turmaId: string | null) => ehAdmin || (!!turmaId && minhas!.has(turmaId))
  return { actor, admin, ehAdmin, acesso }
}

async function turmaAtiva(admin: Db, id: string): Promise<Turma | null> {
  const { data } = await admin.from('turmas').select('id, nome, status').eq('id', id).maybeSingle()
  return data && data.status === 'ativa' ? data : null
}

const limpa = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 500) || null

function revalidar() {
  revalidatePath('/alunos')
  revalidatePath('/turmas', 'layout')
  revalidatePath('/', 'layout') // número de pendências no menu
}

/** Muda o atleta de turma, com histórico e auditoria (igual a editar o atleta). */
async function mover(admin: Db, actor: Actor, aluno: Aluno, destino: Turma, meta: Record<string, unknown>) {
  const { data: origem } = aluno.turma_id
    ? await admin.from('turmas').select('nome').eq('id', aluno.turma_id).maybeSingle()
    : { data: null }
  const { error } = await admin.from('alunos').update({ turma_id: destino.id, updated_at: new Date().toISOString() }).eq('id', aluno.id)
  if (error) return error.message
  await admin.from('historico_atleta').insert({
    aluno_id: aluno.id, tipo: 'mudanca_turma', data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    turma_id: destino.id, turma_nome: destino.nome,
    turma_anterior_id: aluno.turma_id, turma_anterior_nome: origem?.nome ?? null,
  })
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'atleta',
    resourceId: aluno.id, resourceLabel: aluno.nome,
    before: { turma_id: aluno.turma_id, turma: origem?.nome ?? null },
    after: { turma_id: destino.id, turma: destino.nome },
    metadata: { transferencia: meta },
  })
  return null
}

async function temPendente(admin: Db, alunoId: string) {
  const { data } = await admin.from('transferencias').select('id').eq('aluno_id', alunoId).eq('status', 'pendente')
    .gt('expira_em', new Date().toISOString()).limit(1)
  return (data ?? []).length > 0
}

async function criarPedido(admin: Db, actor: Actor, aluno: Aluno, destino: Turma, tipo: 'envio' | 'solicitacao', observacao: string | null) {
  // Pedidos vencidos não podem travar um novo (índice único de pendentes).
  await admin.from('transferencias').update({ status: 'expirada' })
    .eq('aluno_id', aluno.id).eq('status', 'pendente').lte('expira_em', new Date().toISOString())
  const { data, error } = await admin.from('transferencias').insert({
    aluno_id: aluno.id, turma_origem_id: aluno.turma_id, turma_destino_id: destino.id,
    tipo, observacao, criado_por: actor.id,
  }).select('id').single()
  if (error || !data) return error?.code === '23505' ? 'já tem uma transferência aguardando resposta' : 'erro ao registrar o pedido'
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'transferencia',
    resourceId: data.id, resourceLabel: `${aluno.nome} → ${destino.nome}`,
    after: { tipo, turma_origem_id: aluno.turma_id, turma_destino_id: destino.id, observacao },
  })
  return null
}

export type ResultadoTransferencia = {
  error?: string
  movidos: string[]
  enviados: string[]
  ignorados: { nome: string; motivo: string }[]
}

/**
 * "Transferir" a partir da turma de origem (um ou vários atletas): move na hora
 * quando o usuário também tem acesso ao destino; senão envia para o treinador
 * do destino confirmar.
 */
export async function transferirAlunos(alunoIds: string[], destinoId: string, observacao?: string): Promise<ResultadoTransferencia> {
  const vazio: ResultadoTransferencia = { movidos: [], enviados: [], ignorados: [] }
  const { actor, admin, acesso } = await contexto()
  const destino = await turmaAtiva(admin, destinoId)
  if (!destino) return { ...vazio, error: 'Turma de destino inválida.' }
  if (!alunoIds.length || alunoIds.length > 100) return { ...vazio, error: 'Selecione os atletas.' }

  const { data: alunos } = await admin.from('alunos').select('id, nome, status, turma_id').in('id', alunoIds)
  const r: ResultadoTransferencia = { ...vazio }
  for (const aluno of (alunos ?? []) as Aluno[]) {
    if (!acesso(aluno.turma_id)) { r.ignorados.push({ nome: aluno.nome, motivo: 'não é de uma turma sua' }); continue }
    if (aluno.turma_id === destino.id) { r.ignorados.push({ nome: aluno.nome, motivo: 'já está nessa turma' }); continue }
    if (await temPendente(admin, aluno.id)) { r.ignorados.push({ nome: aluno.nome, motivo: 'já tem uma transferência aguardando resposta' }); continue }

    if (acesso(destino.id)) {
      const erro = await mover(admin, actor, aluno, destino, { modo: 'direta', observacao: limpa(observacao) })
      if (erro) r.ignorados.push({ nome: aluno.nome, motivo: erro })
      else r.movidos.push(aluno.nome)
    } else {
      const erro = await criarPedido(admin, actor, aluno, destino, 'envio', limpa(observacao))
      if (erro) r.ignorados.push({ nome: aluno.nome, motivo: erro })
      else r.enviados.push(aluno.nome)
    }
  }
  revalidar()
  return r
}

/** "Solicitar para minha turma": o treinador do destino pede um atleta de outra turma. */
export async function solicitarAluno(alunoId: string, destinoId: string, observacao?: string): Promise<{ error?: string; movido?: boolean }> {
  const { actor, admin, acesso } = await contexto()
  const destino = await turmaAtiva(admin, destinoId)
  if (!destino || !acesso(destino.id)) return { error: 'Escolha uma turma sua como destino.' }
  const { data: aluno } = await admin.from('alunos').select('id, nome, status, turma_id').eq('id', alunoId).maybeSingle()
  if (!aluno || aluno.status !== 'ativo' || !aluno.turma_id) return { error: 'Atleta não encontrado.' }
  if (aluno.turma_id === destino.id) return { error: 'O atleta já está nessa turma.' }
  if (await temPendente(admin, aluno.id)) return { error: 'Esse atleta já tem uma transferência aguardando resposta.' }

  // Se o usuário também tem acesso à turma atual do atleta, não precisa pedir.
  if (acesso(aluno.turma_id)) {
    const erro = await mover(admin, actor, aluno, destino, { modo: 'direta', observacao: limpa(observacao) })
    revalidar()
    return erro ? { error: erro } : { movido: true }
  }
  const erro = await criarPedido(admin, actor, aluno, destino, 'solicitacao', limpa(observacao))
  revalidar()
  return erro ? { error: `Não foi possível pedir: ${erro}.` } : {}
}

/** Aceitar ou recusar — só o lado que responde (ou admin). */
export async function responderTransferencia(id: string, aceitar: boolean, motivo?: string): Promise<{ error?: string }> {
  const { actor, admin, acesso } = await contexto()
  const { data: t } = await admin.from('transferencias').select('*').eq('id', id).maybeSingle()
  if (!t || t.status !== 'pendente') return { error: 'Essa transferência não está mais aguardando resposta.' }
  if (!acesso(ladoQueResponde(t))) return { error: 'Acesso negado.' }
  if (new Date(t.expira_em) <= new Date()) {
    await admin.from('transferencias').update({ status: 'expirada' }).eq('id', id)
    revalidar()
    return { error: 'O pedido expirou. Faça um novo, se ainda fizer sentido.' }
  }

  const { data: aluno } = await admin.from('alunos').select('id, nome, status, turma_id').eq('id', t.aluno_id).maybeSingle()
  const encerrar = async (status: string, extra: Record<string, unknown> = {}) =>
    admin.from('transferencias').update({ status, respondido_por: actor.id, respondido_em: new Date().toISOString(), ...extra }).eq('id', id)

  if (aceitar) {
    // O atleta pode ter mudado de turma (ou sido desligado) depois do pedido.
    if (!aluno || aluno.turma_id !== t.turma_origem_id || aluno.status !== 'ativo') {
      await encerrar('cancelada')
      revalidar()
      return { error: 'O atleta mudou de turma ou de situação desde o pedido; a transferência foi cancelada.' }
    }
    const destino = await turmaAtiva(admin, t.turma_destino_id)
    if (!destino) return { error: 'A turma de destino não está mais ativa.' }
    const erro = await mover(admin, actor, aluno, destino, { modo: t.tipo, transferencia_id: id, observacao: t.observacao })
    if (erro) return { error: erro }
    await encerrar('aceita')
  } else {
    await encerrar('recusada', { motivo_recusa: limpa(motivo) })
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'transferencia',
    resourceId: id, resourceLabel: `${aluno?.nome ?? ''}: transferência ${aceitar ? 'aceita' : 'recusada'}`,
    before: { status: 'pendente' }, after: { status: aceitar ? 'aceita' : 'recusada', motivo_recusa: aceitar ? null : limpa(motivo) },
  })
  revalidar()
  return {}
}

/** Quem pediu (ou admin) desiste antes da resposta. */
export async function cancelarTransferencia(id: string): Promise<{ error?: string }> {
  const { actor, admin, ehAdmin } = await contexto()
  const { data: t } = await admin.from('transferencias').select('status, criado_por').eq('id', id).maybeSingle()
  if (!t || t.status !== 'pendente') return { error: 'Essa transferência não está mais aguardando resposta.' }
  if (t.criado_por !== actor.id && !ehAdmin) return { error: 'Acesso negado.' }
  await admin.from('transferencias').update({ status: 'cancelada', respondido_por: actor.id, respondido_em: new Date().toISOString() }).eq('id', id)
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'transferencia', resourceId: id, resourceLabel: 'Transferência cancelada',
    before: { status: 'pendente' }, after: { status: 'cancelada' },
  })
  revalidar()
  return {}
}
