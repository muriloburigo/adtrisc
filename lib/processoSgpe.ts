// Processo SGPE (FESPORTE etc.) de cada turma, para pré-preencher relatórios,
// diário e ficha de inscrição. Configurado em /configuracoes (processos_sgpe).
//
// Regra: a turma usa o processo escolhido no cadastro dela; se não tiver
// escolhido, usa o processo do ano quando o ano tem um só. Com dois ou mais
// processos no ano e nenhum escolhido, fica vazio (a equipe preenche à mão).
// Os campos continuam editáveis em cada relatório.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type ProcessoSgpe = { id: string; projeto: string; ano: number; processo: string }

/** Lê todos os processos. Erro (tabela ainda não criada) = lista vazia. */
export async function getProcessosSgpe(db: Db): Promise<ProcessoSgpe[]> {
  const { data, error } = await db.from('processos_sgpe').select('id, projeto, ano, processo').order('ano', { ascending: false }).order('projeto')
  return error ? [] : ((data ?? []) as ProcessoSgpe[])
}

export function processoDaTurma(
  processos: ProcessoSgpe[],
  turma: { processo_sgpe_id?: string | null; ano?: number | null },
  anoReferencia?: number,
): ProcessoSgpe | null {
  if (turma.processo_sgpe_id) {
    const escolhido = processos.find((p) => p.id === turma.processo_sgpe_id)
    if (escolhido) return escolhido
  }
  const ano = turma.ano ?? anoReferencia
  const doAno = processos.filter((p) => p.ano === ano)
  return doAno.length === 1 ? doAno[0] : null
}

/**
 * Processo comum a um conjunto de turmas (ex.: as turmas de um treinador no
 * diário). Só devolve se todas apontarem para o mesmo processo.
 */
export function processoComum(
  processos: ProcessoSgpe[],
  turmas: { processo_sgpe_id?: string | null; ano?: number | null }[],
  anoReferencia: number,
): ProcessoSgpe | null {
  const doAno = turmas.filter((t) => t.ano == null || t.ano === anoReferencia)
  const lista = (doAno.length ? doAno : turmas).map((t) => processoDaTurma(processos, t, anoReferencia))
  if (!lista.length) {
    const soDoAno = processos.filter((p) => p.ano === anoReferencia)
    return soDoAno.length === 1 ? soDoAno[0] : null
  }
  const ids = new Set(lista.map((p) => p?.id ?? null))
  return ids.size === 1 && lista[0] ? lista[0] : null
}

/** Processo padrão do diário de um treinador: o comum às turmas que ele atende. */
export async function processoDoTreinador(db: Db, coachId: string, ano: number): Promise<string> {
  const [processos, { data: principais }, { data: auxiliares }] = await Promise.all([
    getProcessosSgpe(db),
    db.from('turmas').select('id, ano, processo_sgpe_id, status').eq('coach_id', coachId),
    db.from('turma_coaches').select('turmas:turma_id ( id, ano, processo_sgpe_id, status )').eq('coach_id', coachId),
  ])
  if (!processos.length) return ''
  type T = { id: string; ano: number | null; processo_sgpe_id: string | null; status: string }
  const todas = new Map<string, T>()
  for (const t of (principais ?? []) as T[]) todas.set(t.id, t)
  for (const r of (auxiliares ?? []) as { turmas: T | null }[]) if (r.turmas) todas.set(r.turmas.id, r.turmas)
  const ativas = [...todas.values()].filter((t) => t.status === 'ativa')
  return processoComum(processos, ativas.length ? ativas : [...todas.values()], ano)?.processo ?? ''
}
