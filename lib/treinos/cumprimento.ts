import 'server-only'
import { hojeISO, somarDias } from './datas'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type Cumprimento = {
  planejados: number          // treinos publicados do atleta que já passaram, nos últimos `dias`
  feitos: number              // marcados feito/parcial (pelo atleta, treinador ou automático)
  percentual: number | null   // feitos / planejados
  ultimo: string | null       // data do último treino feito (qualquer época)
  portal: boolean             // tem conta no portal
  intervals: boolean          // conectou o Intervals.icu
}

/**
 * Cumprimento dos treinos por atleta (usa o client que vier: com RLS, a
 * equipe só calcula os atletas que enxerga). Conta só o que já passou
 * (até ontem) e só treinos publicados; o ajuste individual substitui o da turma.
 */
export async function cumprimentoDosAtletas(db: Db, alunos: { id: string; turma_id: string | null; profile_id?: string | null }[], dias = 30): Promise<Map<string, Cumprimento>> {
  const out = new Map<string, Cumprimento>()
  if (!alunos.length) return out
  const hoje = hojeISO(), ate = somarDias(hoje, -1), de = somarDias(hoje, -dias)
  const ids = alunos.map((a) => a.id)
  const turmas = [...new Set(alunos.map((a) => a.turma_id).filter(Boolean))] as string[]
  const vazio = ['00000000-0000-0000-0000-000000000000']
  const [{ data: daTurma }, { data: proprias }, { data: entregas }, { data: conexoes }] = await Promise.all([
    db.from('treino_sessoes').select('id, turma_id').in('turma_id', turmas.length ? turmas : vazio).eq('status', 'publicado').gte('data', de).lte('data', ate),
    db.from('treino_sessoes').select('id, aluno_id, sessao_origem_id').in('aluno_id', ids).eq('status', 'publicado').gte('data', de).lte('data', ate),
    db.from('treino_entregas').select('aluno_id, sessao_id, situacao, treino_sessoes!inner(data)').in('aluno_id', ids).in('situacao', ['feito', 'parcial']).order('treino_sessoes(data)', { ascending: false }),
    db.from('intervals_conexoes').select('aluno_id').in('aluno_id', ids),
  ])
  type Ent = { aluno_id: string; sessao_id: string; treino_sessoes: { data: string } }
  const feitasPorAluno = new Map<string, Ent[]>()
  for (const e of (entregas ?? []) as Ent[]) feitasPorAluno.set(e.aluno_id, [...(feitasPorAluno.get(e.aluno_id) ?? []), e])
  const conectados = new Set(((conexoes ?? []) as { aluno_id: string }[]).map((c) => c.aluno_id))

  for (const a of alunos) {
    const minhas = ((proprias ?? []) as { id: string; aluno_id: string; sessao_origem_id: string | null }[]).filter((s) => s.aluno_id === a.id)
    const substituidas = new Set(minhas.map((s) => s.sessao_origem_id))
    const validas = new Set([
      ...((daTurma ?? []) as { id: string; turma_id: string }[]).filter((s) => s.turma_id === a.turma_id && !substituidas.has(s.id)).map((s) => s.id),
      ...minhas.map((s) => s.id),
    ])
    const feitas = feitasPorAluno.get(a.id) ?? []
    const feitos = feitas.filter((e) => validas.has(e.sessao_id)).length
    out.set(a.id, {
      planejados: validas.size, feitos,
      percentual: validas.size ? Math.round((feitos / validas.size) * 100) : null,
      ultimo: feitas.reduce<string | null>((m, e) => (e.treino_sessoes.data <= hoje && (!m || e.treino_sessoes.data > m) ? e.treino_sessoes.data : m), null),
      portal: Boolean(a.profile_id), intervals: conectados.has(a.id),
    })
  }
  return out
}
