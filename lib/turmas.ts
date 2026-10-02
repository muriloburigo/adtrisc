// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTurmaIdsForCoach(supabase: any, coachId: string): Promise<string[]> {
  const [{ data: principal }, { data: aux }] = await Promise.all([
    supabase.from('turmas').select('id').eq('coach_id', coachId),
    supabase.from('turma_coaches').select('turma_id').eq('coach_id', coachId),
  ])

  const ids = new Set([
    ...(principal ?? []).map((t: { id: string }) => t.id),
    ...(aux ?? []).map((t: { turma_id: string }) => t.turma_id),
  ])

  return [...ids]
}

/**
 * Turmas (id, nome) em que o treinador atua — titular ou auxiliar, que têm as
 * mesmas permissões. Use no lugar de `.eq('coach_id', ...)` em `turmas`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTurmasDoCoach(supabase: any, coachId: string, { somenteAtivas = false } = {}): Promise<{ id: string; nome: string }[]> {
  const ids = await getTurmaIdsForCoach(supabase, coachId)
  if (!ids.length) return []
  let q = supabase.from('turmas').select('id, nome').in('id', ids).order('nome')
  if (somenteAtivas) q = q.eq('status', 'ativa')
  const { data } = await q
  return (data ?? []) as { id: string; nome: string }[]
}
