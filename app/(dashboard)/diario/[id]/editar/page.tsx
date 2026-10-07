import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// A edição virou o modal do calendário do diário: abre o mês da aula.
export default async function EditarDiarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('registros_aula').select('data, coach_id').eq('id', id).maybeSingle()
  if (!data) redirect('/diario')
  const [ano, mes] = data.data.split('-')
  redirect(`/diario?mes=${Number(mes)}&ano=${ano}&coach=${data.coach_id}`)
}
