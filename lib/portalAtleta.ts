import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Passo, SessaoBase } from '@/lib/treinos/tipos'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type AtletaLogado = { userId: string; aluno: { id: string; nome: string; turma_id: string | null; turma: string | null } }

/** Atleta da sessão (perfil 'aluno' ligado a um atleta ativo). Staff vai para o painel. */
export async function atletaLogado(): Promise<{ db: Db; atleta: AtletaLogado | null }> {
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (perfil?.role !== 'aluno') redirect('/dashboard')
  // RLS (alunos_select_proprio): só devolve o próprio cadastro, e só se ativo.
  const { data: a } = await db.from('alunos').select('id, nome, turma_id, turmas:turma_id ( nome )').eq('profile_id', user.id).eq('status', 'ativo').maybeSingle()
  return { db, atleta: a ? { userId: user.id, aluno: { id: a.id, nome: a.nome, turma_id: a.turma_id, turma: a.turmas?.nome ?? null } } : null }
}

export type TreinoAtleta = SessaoBase & {
  id: string
  data: string
  ordem: number
  carga: number | null
  local: string | null
  chave: boolean
  notas: string | null
  passos: Passo[]
  situacao: 'planejado' | 'feito' | 'nao_feito' | 'parcial'
  ajustado: boolean
  ordemAtleta: number | null   // ordem pessoal no dia (arrastada no portal)
}

/** Treinos publicados do atleta no período: os da turma (ou o ajuste individual no lugar) + os individuais. */
export async function treinosDoAtleta(db: Db, aluno: AtletaLogado['aluno'], de: string, ate: string): Promise<TreinoAtleta[]> {
  const sel = 'id, data, ordem, titulo, tipo, modalidade, duracao_min, distancia_km, carga, local, chave, notas, sessao_origem_id, turma_id, treino_passos(*)'
  const [{ data: daTurma }, { data: meus }, { data: entregas }] = await Promise.all([
    aluno.turma_id ? db.from('treino_sessoes').select(sel).eq('turma_id', aluno.turma_id).eq('status', 'publicado').gte('data', de).lte('data', ate) : Promise.resolve({ data: [] }),
    db.from('treino_sessoes').select(sel).eq('aluno_id', aluno.id).eq('status', 'publicado').gte('data', de).lte('data', ate),
    db.from('treino_entregas').select('sessao_id, situacao, ordem').eq('aluno_id', aluno.id),
  ])
  type Row = TreinoAtleta & { sessao_origem_id: string | null; treino_passos: Passo[] }
  const proprios = (meus ?? []) as Row[]
  const substituidos = new Set(proprios.map((s) => s.sessao_origem_id).filter(Boolean))
  const entrega = new Map(((entregas ?? []) as { sessao_id: string; situacao: TreinoAtleta['situacao']; ordem: number | null }[]).map((e) => [e.sessao_id, e]))
  const montar = (s: Row): TreinoAtleta => {
    const { treino_passos, sessao_origem_id, ...r } = s
    return { ...r, passos: [...(treino_passos ?? [])].sort((a, b) => a.ordem - b.ordem), situacao: entrega.get(s.id)?.situacao ?? 'planejado', ajustado: Boolean(sessao_origem_id), ordemAtleta: entrega.get(s.id)?.ordem ?? null }
  }
  return [...((daTurma ?? []) as Row[]).filter((s) => !substituidos.has(s.id)), ...proprios]
    .map(montar)
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : Number(a.ordemAtleta ?? a.ordem) - Number(b.ordemAtleta ?? b.ordem)))
}
