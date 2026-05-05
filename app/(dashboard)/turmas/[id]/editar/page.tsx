import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import TurmaForm from '@/components/turmas/TurmaForm'
import { updateTurma } from '../../actions'
import type { TurmaRow } from '@/types/database'

export default async function EditarTurmaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: coachesRaw }] = await Promise.all([
    supabase.from('turmas').select('*').eq('id', id).single(),
    supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
  ])

  if (!turmaRaw) notFound()

  const turma = turmaRaw as TurmaRow
  const coaches = (coachesRaw ?? []) as { id: string; full_name: string | null }[]
  const action = updateTurma.bind(null, id)

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader title="Editar Turma" subtitle={turma.nome} />
      <Card>
        <TurmaForm action={action} turma={turma} coaches={coaches} submitLabel="Salvar alterações" />
      </Card>
    </div>
  )
}
