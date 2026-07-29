export type AlunoAlerta = {
  alunoId: string
  nome: string
  turmaId: string
  turmaNome: string
  ultimasFaltas: string[]
}

type PresencaBasic = { aluno_id: string; data: string; presente: boolean; justificada: boolean }
type AlunoBasic = { id: string; nome: string; turma_id: string | null; turmas: { nome: string } | null }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getAlertasFaltas(supabase: any, opts?: { turmaId?: string }): Promise<AlunoAlerta[]> {
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toLocaleDateString('en-CA')

  let alunosQuery = supabase
    .from('alunos')
    .select('id, nome, turma_id, turmas:turma_id ( nome )')
    .eq('status', 'ativo')
  if (opts?.turmaId) alunosQuery = alunosQuery.eq('turma_id', opts.turmaId)

  let presencasQuery = supabase
    .from('presencas')
    .select('aluno_id, data, presente, justificada')
    .is('deleted_at', null)
    .gte('data', sinceStr)
    .order('data', { ascending: false })
  if (opts?.turmaId) presencasQuery = presencasQuery.eq('turma_id', opts.turmaId)

  const [{ data: alunosRaw }, { data: presencasRaw }] = await Promise.all([alunosQuery, presencasQuery])

  const alunos = (alunosRaw ?? []) as AlunoBasic[]
  const presencas = (presencasRaw ?? []) as PresencaBasic[]

  const porAluno = new Map<string, PresencaBasic[]>()
  for (const p of presencas) {
    if (!porAluno.has(p.aluno_id)) porAluno.set(p.aluno_id, [])
    porAluno.get(p.aluno_id)!.push(p)
  }

  const alertas: AlunoAlerta[] = []
  for (const aluno of alunos) {
    if (!aluno.turma_id) continue
    const historico = porAluno.get(aluno.id)
    if (!historico || historico.length < 2) continue

    const ultimasDuas = historico.slice(0, 2)
    const ambasFaltaNaoJustificada = ultimasDuas.every((p) => !p.presente && !p.justificada)
    if (!ambasFaltaNaoJustificada) continue

    alertas.push({
      alunoId: aluno.id,
      nome: aluno.nome,
      turmaId: aluno.turma_id,
      turmaNome: aluno.turmas?.nome ?? '—',
      ultimasFaltas: ultimasDuas.map((p) => p.data),
    })
  }

  return alertas
}
