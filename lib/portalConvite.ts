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

export type ConviteTurmaItem = {
  alunoId: string; nome: string; url: string; expira: string; novo: boolean
  contatos: { nome: string; telefone: string }[]
}

/**
 * Convites do portal da turma (service role — quem chama já conferiu o acesso
 * à turma pela RLS). Com `gerar`, cria convite para cada atleta ativo sem conta
 * e sem convite válido; os válidos são reaproveitados (não invalida links já
 * enviados). Devolve só atletas ainda sem conta, e quantos já têm acesso.
 */
export async function convitesDaTurma(turmaId: string, gerar: boolean, criadoPor?: string): Promise<{ itens: ConviteTurmaItem[]; comAcesso: number }> {
  const db = createAdminClient() as Db
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://adtrisc.vercel.app').replace(/\/$/, '')
  const { data: alunos } = await db.from('alunos').select('id, nome, telefone, profile_id').eq('turma_id', turmaId).eq('status', 'ativo').order('nome')
  const todos = (alunos ?? []) as { id: string; nome: string; telefone: string | null; profile_id: string | null }[]
  const semConta = todos.filter((a) => !a.profile_id)
  const ids = semConta.length ? semConta.map((a) => a.id) : ['00000000-0000-0000-0000-000000000000']
  const agora = new Date().toISOString()
  const [{ data: abertos }, { data: resps }] = await Promise.all([
    db.from('portal_convites').select('aluno_id, token, expires_at').in('aluno_id', ids).eq('tipo', 'criar').is('usado_em', null).gt('expires_at', agora).order('created_at', { ascending: false }),
    db.from('aluno_responsavel').select('aluno_id, responsaveis ( nome, telefone )').in('aluno_id', ids),
  ])
  const convite = new Map<string, { token: string; expires_at: string; novo: boolean }>()
  for (const c of (abertos ?? []) as { aluno_id: string; token: string; expires_at: string }[]) if (!convite.has(c.aluno_id)) convite.set(c.aluno_id, { ...c, novo: false })
  if (gerar) {
    const faltam = semConta.filter((a) => !convite.has(a.id))
    if (faltam.length) {
      const { data: novos } = await db.from('portal_convites').insert(faltam.map((a) => ({ aluno_id: a.id, tipo: 'criar', criado_por: criadoPor ?? null }))).select('aluno_id, token, expires_at')
      for (const c of (novos ?? []) as { aluno_id: string; token: string; expires_at: string }[]) convite.set(c.aluno_id, { ...c, novo: true })
    }
  }
  const contatosDe = new Map<string, { nome: string; telefone: string }[]>()
  for (const r of (resps ?? []) as { aluno_id: string; responsaveis: { nome: string | null; telefone: string | null } | null }[]) {
    if (r.responsaveis?.telefone) contatosDe.set(r.aluno_id, [...(contatosDe.get(r.aluno_id) ?? []), { nome: (r.responsaveis.nome ?? 'Responsável').split(' ')[0], telefone: r.responsaveis.telefone }])
  }
  const so = (t: string) => t.replace(/\D/g, '')
  const itens = semConta.filter((a) => convite.has(a.id)).map((a) => {
    const c = convite.get(a.id)!
    const lista = [...(contatosDe.get(a.id) ?? []), ...(a.telefone ? [{ nome: a.nome.split(' ')[0], telefone: a.telefone }] : [])]
      .filter((x, i, l) => l.findIndex((y) => so(y.telefone) === so(x.telefone)) === i)
    return { alunoId: a.id, nome: a.nome, url: `${base}/convite/${c.token}`, expira: c.expires_at, novo: c.novo, contatos: lista }
  })
  return { itens, comAcesso: todos.length - semConta.length }
}
