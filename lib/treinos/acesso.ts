import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
export type Ator = { userId: string; nome: string; papel: 'staff' | 'atleta'; db: Db }

/**
 * Quem pode mexer nas atividades/treinos de um atleta: a equipe da turma dele
 * (titular, auxiliar, admin — conferido pela RLS de alunos) ou o próprio atleta.
 */
export async function atorParaAtleta(alunoId: string): Promise<Ator | null> {
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data: p } = await db.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (p?.role === 'admin' || p?.role === 'coach') {
    const { data: a } = await db.from('alunos').select('id').eq('id', alunoId).maybeSingle()
    return a ? { userId: user.id, nome: p.full_name ?? user.email, papel: 'staff', db } : null
  }
  if (p?.role === 'aluno') {
    const { data: a } = await db.from('alunos').select('id, nome').eq('id', alunoId).eq('profile_id', user.id).eq('status', 'ativo').maybeSingle()
    return a ? { userId: user.id, nome: a.nome, papel: 'atleta', db } : null
  }
  return null
}

/** O atleta da sessão do usuário (se for atleta). */
export async function meuAlunoId(): Promise<string | null> {
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) return null
  const { data } = await db.from('alunos').select('id').eq('profile_id', user.id).eq('status', 'ativo').maybeSingle()
  return data?.id ?? null
}

/** Dono de uma execução (lido com service role; o acesso é conferido depois por atorParaAtleta). */
export async function alunoDaExecucao(execId: string): Promise<string | null> {
  const { data } = await (createAdminClient() as Db).from('treino_execucoes').select('aluno_id').eq('id', execId).maybeSingle()
  return data?.aluno_id ?? null
}
