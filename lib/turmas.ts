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
