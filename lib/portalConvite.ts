import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

/** Convite válido: existe, não usado, no prazo, atleta ativo numa turma com o módulo. */
export async function lerConvite(token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null
  const db = createAdminClient() as Db
  const { data } = await db.from('portal_convites')
    .select('id, tipo, aluno_id, usado_em, expires_at, alunos ( id, nome, status, profile_id, turmas:turma_id ( usa_treinos ) )')
    .eq('token', token).maybeSingle()
  if (!data) return null
  const aluno = data.alunos as { id: string; nome: string; status: string; profile_id: string | null; turmas: { usa_treinos: boolean } | null }
  const valido = !data.usado_em && new Date(data.expires_at) > new Date() && aluno?.status === 'ativo' && Boolean(aluno.turmas?.usa_treinos)
    && (data.tipo === 'criar' ? !aluno.profile_id : Boolean(aluno.profile_id))
  return { id: data.id as string, tipo: data.tipo as 'criar' | 'senha', valido, aluno }
}
