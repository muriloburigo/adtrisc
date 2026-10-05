'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { gerarPlano, type EntradaGerador } from '@/lib/treinos/gerador'
import { removerAntesDeApagar, sincronizarDepois } from '@/lib/intervals/gatilhos'
import { somarDias } from '@/lib/treinos/datas'
import { DIFICULDADES, MODALIDADES, OBJETIVOS, type Passo } from '@/lib/treinos/tipos'

// Planos de treino — porte de CreateTrainingPlanAction, UpdateTrainingPlanAction,
// PublishTrainingPlanAction, DuplicateTrainingPlanAction e DeleteTrainingPlanAction
// do Movelly. Um plano é da turma (ou de um atleta) e agrupa os treinos de um
// período; os treinos continuam editáveis um a um no calendário.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
const limpa = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim() || null
const revalidar = () => { revalidatePath('/treinos', 'layout'); revalidatePath('/portal', 'layout') }
const ISO = /^\d{4}-\d{2}-\d{2}$/

export type PlanoForm = {
  turma_id?: string | null
  aluno_id?: string | null
  titulo: string
  notas?: string | null
  prova_alvo_nome?: string | null
  gerar: boolean                       // false = plano manual (vazio)
  entrada: EntradaGerador
}

async function moduloLigado(db: Db, turmaId?: string | null, alunoId?: string | null) {
  let id = turmaId
  if (!id && alunoId) id = (await db.from('alunos').select('turma_id').eq('id', alunoId).maybeSingle()).data?.turma_id
  if (!id) return false
  return Boolean((await db.from('turmas').select('usa_treinos').eq('id', id).maybeSingle()).data?.usa_treinos)
}

/** Ordem livre por dia: os treinos do plano entram depois dos que já existem. */
async function proximaOrdemPorDia(db: Db, escopo: { turma_id?: string | null; aluno_id?: string | null }, de: string, ate: string) {
  let q = db.from('treino_sessoes').select('data, ordem').gte('data', de).lte('data', ate).is('sessao_origem_id', null)
  q = escopo.turma_id ? q.eq('turma_id', escopo.turma_id) : q.eq('aluno_id', escopo.aluno_id)
  const { data } = await q
  const max = new Map<string, number>()
  for (const s of (data ?? []) as { data: string; ordem: number }[]) max.set(s.data, Math.max(max.get(s.data) ?? 0, s.ordem))
  return (dia: string) => { const n = (max.get(dia) ?? 0) + 1; max.set(dia, n); return n }
}

async function inserirSessoes(db: Db, linhas: Record<string, unknown>[], passos: Record<string, unknown>[]) {
  for (let i = 0; i < linhas.length; i += 200) {
    const { error } = await db.from('treino_sessoes').insert(linhas.slice(i, i + 200))
    if (error) return error
  }
  for (let i = 0; i < passos.length; i += 500) {
    const { error } = await db.from('treino_passos').insert(passos.slice(i, i + 500))
    if (error) return error
  }
  return null
}

export async function criarPlano(f: PlanoForm): Promise<{ error?: string; id?: string; sessoes?: number }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const e = f.entrada
  if (!f.turma_id && !f.aluno_id) return { error: 'Escolha a turma ou o atleta.' }
  if (!limpa(f.titulo)) return { error: 'Dê um nome ao plano.' }
  if (!ISO.test(e.inicio) || !ISO.test(e.fim) || e.fim < e.inicio) return { error: 'Período inválido.' }
  if (!(e.objetivo in OBJETIVOS) || !(e.dificuldade in DIFICULDADES) || !(e.modalidade in MODALIDADES)) return { error: 'Dados do plano inválidos.' }
  if (e.prova_alvo_data && !ISO.test(e.prova_alvo_data)) return { error: 'Data da prova inválida.' }
  if (e.multi) {
    const ok = Array.isArray(e.multi.modalidades) && e.multi.modalidades.length <= 3
      && e.multi.modalidades.every((m) => ['swimming', 'cycling', 'running'].includes(m.modalidade) && Number.isInteger(m.sessoes) && m.sessoes >= 0 && m.sessoes <= 7
        && Number.isInteger(m.dia_longo) && m.dia_longo >= 1 && m.dia_longo <= 7 && (m.distancia_alvo_km == null || (m.distancia_alvo_km > 0 && m.distancia_alvo_km < 500)))
      && new Set(e.multi.modalidades.map((m) => m.modalidade)).size === e.multi.modalidades.length
      && [1, 2, 3].includes(e.multi.max_por_dia) && typeof e.multi.transicao === 'boolean'
    if (!ok) return { error: 'Configuração do plano multiesporte inválida.' }
  }
  if (!(await moduloLigado(db, f.turma_id, f.aluno_id))) return { error: 'O módulo de treinos não está ligado para esta turma.' }

  // Regera no servidor: a prévia do navegador é só para mostrar.
  const gerado = f.gerar && e.objetivo !== 'manual' ? gerarPlano(e) : null
  if (gerado && !gerado.sessoes.length) return { error: gerado.avisos[0] ?? 'Nenhum treino gerado.' }

  const id = randomUUID()
  const plano = {
    id, turma_id: f.turma_id ?? null, aluno_id: f.aluno_id ?? null,
    titulo: limpa(f.titulo)!.slice(0, 120), objetivo: e.objetivo, modo_geracao: gerado ? 'automatic' : 'manual',
    inicio: e.inicio, fim: e.fim, prova_alvo_data: e.prova_alvo_data || null, prova_alvo_nome: limpa(f.prova_alvo_nome),
    sessoes_semana: e.multi ? e.multi.modalidades.reduce((t, m) => t + m.sessoes, 0) : e.sessoes_semana, dias_disponiveis: e.dias_disponiveis, dificuldade: e.dificuldade,
    distancia_alvo_km: e.distancia_alvo_km || null, notas: limpa(f.notas),
    payload_gerador: gerado ? { entrada: e, resumo: gerado.resumo, avisos: gerado.avisos } : null,
    criado_por: actor.id,
  }
  const { error } = await db.from('treino_planos').insert(plano)
  if (error) return { error: friendlyError(error, 'Erro ao criar o plano.') }

  if (gerado) {
    const ordem = await proximaOrdemPorDia(db, f, e.inicio, e.fim)
    const linhas: Record<string, unknown>[] = [], passos: Record<string, unknown>[] = []
    for (const s of gerado.sessoes) {
      const sid = randomUUID()
      linhas.push({
        id: sid, plano_id: id, turma_id: plano.turma_id, aluno_id: plano.aluno_id, data: s.data, ordem: ordem(s.data),
        titulo: s.titulo, tipo: s.tipo, modalidade: s.modalidade, duracao_min: s.duracao_min, distancia_km: s.distancia_km,
        carga: s.carga, intensidade_tipo: s.intensidade_tipo, intensidade_alvo: s.intensidade_alvo, chave: s.chave, notas: s.notas,
        criado_por: actor.id,
      })
      for (const p of s.passos) passos.push({ ...p, sessao_id: sid })
    }
    const erro = await inserirSessoes(db, linhas, passos)
    if (erro) {
      await db.from('treino_planos').delete().eq('id', id)
      return { error: friendlyError(erro, 'Erro ao criar os treinos do plano.') }
    }
  }

  await logAudit({
    userId: actor.id, userName: actor.name, action: 'criar', resource: 'treino', resourceId: id,
    resourceLabel: `Plano: ${plano.titulo} (${gerado?.sessoes.length ?? 0} treinos)`,
    after: { ...plano, payload_gerador: undefined },
  })
  revalidar()
  return { id, sessoes: gerado?.sessoes.length ?? 0 }
}

export async function atualizarPlano(id: string, f: { titulo: string; notas?: string | null; prova_alvo_nome?: string | null; prova_alvo_data?: string | null }): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  if (!limpa(f.titulo)) return { error: 'Dê um nome ao plano.' }
  if (f.prova_alvo_data && !ISO.test(f.prova_alvo_data)) return { error: 'Data da prova inválida.' }
  const dados = { titulo: limpa(f.titulo)!.slice(0, 120), notas: limpa(f.notas), prova_alvo_nome: limpa(f.prova_alvo_nome), prova_alvo_data: f.prova_alvo_data || null, updated_at: new Date().toISOString() }
  const { data, error } = await db.from('treino_planos').update(dados).eq('id', id).select('id').maybeSingle()
  if (error) return { error: friendlyError(error, 'Erro ao salvar o plano.') }
  if (!data) return { error: 'Plano não encontrado.' }
  await logAudit({ userId: actor.id, userName: actor.name, action: 'editar', resource: 'treino', resourceId: id, resourceLabel: `Plano: ${dados.titulo}`, after: dados })
  revalidar()
  return {}
}

/** Publica o plano: todos os treinos dele (e os ajustes individuais desses treinos). */
export async function publicarPlano(id: string): Promise<{ error?: string; publicados?: number }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const agora = new Date().toISOString()
  const { data: plano } = await db.from('treino_planos').select('titulo').eq('id', id).maybeSingle()
  if (!plano) return { error: 'Plano não encontrado.' }
  const { data: sessoes, error } = await db.from('treino_sessoes').update({ status: 'publicado', publicado_em: agora })
    .eq('plano_id', id).eq('status', 'rascunho').select('id')
  if (error) return { error: friendlyError(error, 'Erro ao publicar.') }
  const ids = ((sessoes ?? []) as { id: string }[]).map((s) => s.id)
  if (ids.length) await db.from('treino_sessoes').update({ status: 'publicado', publicado_em: agora }).in('sessao_origem_id', ids).eq('status', 'rascunho')
  await db.from('treino_planos').update({ status: 'publicado', publicado_em: agora, publicado_por: actor.id }).eq('id', id)
  sincronizarDepois(ids)
  await logAudit({ userId: actor.id, userName: actor.name, action: 'status', resource: 'treino', resourceId: id, resourceLabel: `Publicou o plano ${plano.titulo} (${ids.length} treinos)` })
  revalidar()
  return { publicados: ids.length }
}

/** Copia o plano para outro início (mesma turma/atleta), tudo como rascunho. */
export async function duplicarPlano(id: string, novoInicio: string): Promise<{ error?: string; id?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  if (!ISO.test(novoInicio)) return { error: 'Data inválida.' }
  const { data: p } = await db.from('treino_planos').select('*').eq('id', id).maybeSingle()
  if (!p) return { error: 'Plano não encontrado.' }
  const delta = Math.round((new Date(`${novoInicio}T12:00:00Z`).getTime() - new Date(`${p.inicio}T12:00:00Z`).getTime()) / 86_400_000)
  if (delta === 0) return { error: 'Escolha outra data de início.' }
  const novoId = randomUUID()
  const { error } = await db.from('treino_planos').insert({
    id: novoId, turma_id: p.turma_id, aluno_id: p.aluno_id, titulo: `${p.titulo} (cópia)`.slice(0, 120), objetivo: p.objetivo,
    modo_geracao: p.modo_geracao, inicio: somarDias(p.inicio, delta), fim: somarDias(p.fim, delta),
    prova_alvo_data: p.prova_alvo_data ? somarDias(p.prova_alvo_data, delta) : null, prova_alvo_nome: p.prova_alvo_nome,
    sessoes_semana: p.sessoes_semana, dias_disponiveis: p.dias_disponiveis, dificuldade: p.dificuldade,
    distancia_alvo_km: p.distancia_alvo_km, notas: p.notas, payload_gerador: p.payload_gerador, criado_por: actor.id,
  })
  if (error) return { error: friendlyError(error, 'Erro ao duplicar o plano.') }

  const { data: sessoes } = await db.from('treino_sessoes').select('*, treino_passos(*)').eq('plano_id', id)
  const ordem = await proximaOrdemPorDia(db, p, somarDias(p.inicio, delta), somarDias(p.fim, delta))
  const linhas: Record<string, unknown>[] = [], passos: Record<string, unknown>[] = []
  for (const s of (sessoes ?? []) as (Record<string, unknown> & { data: string; treino_passos: Passo[] })[]) {
    const sid = randomUUID()
    const { treino_passos, id: _i, created_at: _c, updated_at: _u, publicado_em: _p, status: _s, ...resto } = s // eslint-disable-line @typescript-eslint/no-unused-vars
    const data = somarDias(s.data, delta)
    linhas.push({ ...resto, id: sid, plano_id: novoId, data, ordem: ordem(data), criado_por: actor.id })
    for (const { id: _pid, sessao_id: _sid, modelo_id: _mid, created_at: _pc, ...ps } of treino_passos as (Passo & Record<string, unknown>)[]) passos.push({ ...ps, sessao_id: sid }) // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  const erro = await inserirSessoes(db, linhas, passos)
  if (erro) {
    await db.from('treino_planos').delete().eq('id', novoId)
    return { error: friendlyError(erro, 'Erro ao copiar os treinos do plano.') }
  }
  await logAudit({ userId: actor.id, userName: actor.name, action: 'criar', resource: 'treino', resourceId: novoId, resourceLabel: `Duplicou o plano ${p.titulo} para ${novoInicio} (${linhas.length} treinos)` })
  revalidar()
  return { id: novoId }
}

/** Apaga o plano e TODOS os treinos dele (inclusive ajustes). */
export async function apagarPlano(id: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const { data: doPlano } = await db.from('treino_sessoes').select('id').eq('plano_id', id)
  await removerAntesDeApagar(((doPlano ?? []) as { id: string }[]).map((x) => x.id))
  const { data, error } = await db.from('treino_planos').delete().eq('id', id).select('titulo').maybeSingle()
  if (error) return { error: friendlyError(error, 'Erro ao apagar o plano.') }
  if (!data) return { error: 'Plano não encontrado.' }
  await logAudit({ userId: actor.id, userName: actor.name, action: 'excluir', resource: 'treino', resourceId: id, resourceLabel: `Plano: ${data.titulo}` })
  revalidar()
  return {}
}
