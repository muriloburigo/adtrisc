'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'

// Acesso do atleta ao portal: o treinador gera o link de convite (criar conta
// ou nova senha) e manda pelo WhatsApp. Escritas pelo service role, mas só
// depois de conferir pelo cliente com RLS que o usuário enxerga o atleta
// (titular, auxiliar ou admin) — padrão assertAlunoAccess de fichas/actions.ts.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

async function alunoAcessivel(alunoId: string) {
  const db = (await createClient()) as Db
  const { data } = await db.from('alunos').select('id, nome, status, profile_id, turmas:turma_id ( usa_treinos )').eq('id', alunoId).maybeSingle()
  return data as { id: string; nome: string; status: string; profile_id: string | null; turmas: { usa_treinos: boolean } | null } | null
}

export async function gerarConvitePortal(alunoId: string): Promise<{ error?: string; url?: string; tipo?: 'criar' | 'senha' }> {
  const actor = await requireStaff()
  const aluno = await alunoAcessivel(alunoId)
  if (!aluno) return { error: 'Atleta não encontrado.' }
  if (aluno.status !== 'ativo') return { error: 'Só atletas ativos têm acesso ao portal.' }
  if (!aluno.turmas?.usa_treinos) return { error: 'A turma deste atleta não usa o módulo de treinos.' }

  const admin = createAdminClient() as Db
  const tipo = aluno.profile_id ? 'senha' : 'criar'
  // Um link válido por vez: os anteriores ainda não usados deixam de valer.
  await admin.from('portal_convites').update({ expires_at: new Date().toISOString() }).eq('aluno_id', alunoId).is('usado_em', null).gt('expires_at', new Date().toISOString())
  const { data, error } = await admin.from('portal_convites').insert({ aluno_id: alunoId, tipo, criado_por: actor.id }).select('token').single()
  if (error || !data) return { error: 'Não foi possível gerar o link.' }

  await logAudit({
    userId: actor.id, userName: actor.name, action: 'criar', resource: 'portal',
    resourceId: alunoId, resourceLabel: `${tipo === 'criar' ? 'Convite do portal' : 'Link de nova senha'}: ${aluno.nome}`,
  })
  revalidatePath(`/alunos/${alunoId}`)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.adtrisc.com.br'
  return { url: `${base}/convite/${data.token}`, tipo }
}

/** Tira o acesso: apaga a conta de login do atleta (o cadastro e os treinos ficam). */
export async function removerAcessoPortal(alunoId: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const aluno = await alunoAcessivel(alunoId)
  if (!aluno) return { error: 'Atleta não encontrado.' }
  if (!aluno.profile_id) return {}
  const admin = createAdminClient() as Db
  const { data: perfil } = await admin.from('profiles').select('role').eq('id', aluno.profile_id).maybeSingle()
  // Nunca apaga conta de staff por aqui, mesmo que esteja ligada ao atleta por engano.
  if (perfil && perfil.role !== 'aluno') return { error: 'Esta conta não é de atleta; fale com um administrador.' }
  await admin.from('alunos').update({ profile_id: null }).eq('id', alunoId)
  const { error } = await admin.auth.admin.deleteUser(aluno.profile_id)
  if (error) return { error: 'Não foi possível remover a conta.' }
  await admin.from('portal_convites').update({ expires_at: new Date().toISOString() }).eq('aluno_id', alunoId).is('usado_em', null)
  await logAudit({ userId: actor.id, userName: actor.name, action: 'excluir', resource: 'portal', resourceId: alunoId, resourceLabel: `Removeu o acesso ao portal: ${aluno.nome}` })
  revalidatePath(`/alunos/${alunoId}`)
  return {}
}

/** Convites do portal para todos os atletas da turma que ainda não têm acesso. */
export async function gerarConvitesTurma(turmaId: string): Promise<{ error?: string; itens?: import('@/lib/portalConvite').ConviteTurmaItem[]; comAcesso?: number }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  // RLS: só a equipe da turma (titular, auxiliar) ou admin enxerga a turma.
  const { data: t } = await db.from('turmas').select('id, nome, usa_treinos').eq('id', turmaId).maybeSingle()
  if (!t) return { error: 'Turma não encontrada.' }
  if (!t.usa_treinos) return { error: 'Esta turma não usa o módulo de treinos.' }
  const { convitesDaTurma } = await import('@/lib/portalConvite')
  const r = await convitesDaTurma(turmaId, true, actor.id)
  const novos = r.itens.filter((i) => i.novo).length
  if (novos) {
    await logAudit({ userId: actor.id, userName: actor.name, action: 'criar', resource: 'portal', resourceId: turmaId, resourceLabel: `Convites do portal em lote: ${t.nome} (${novos} novo${novos > 1 ? 's' : ''})` })
  }
  revalidatePath(`/turmas/${turmaId}`)
  return r
}
