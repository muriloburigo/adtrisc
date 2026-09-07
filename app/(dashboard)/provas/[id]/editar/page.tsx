import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import ProvaBasicForm from '@/components/provas/ProvaBasicForm'
import { updateProva } from '../../actions'
import type { ProvaRow } from '@/types/database'

export default async function EditarProvaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: provaRaw } = await supabase.from('provas').select('*').eq('id', id).single()
  if (!provaRaw) notFound()

  const prova = provaRaw as ProvaRow
  const action = updateProva.bind(null, id)

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Editar Prova" subtitle={prova.nome} />
      <Card>
        <ProvaBasicForm action={action} prova={prova} />
      </Card>
    </div>
  )
}
