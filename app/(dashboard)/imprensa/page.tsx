import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import MateriaForm from '@/components/imprensa/MateriaForm'
import MateriaCard from '@/components/imprensa/MateriaCard'
import { Newspaper } from 'lucide-react'
import type { MateriaImprensaRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ImprensaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data } = await supabase
    .from('materias_imprensa')
    .select('*')
    .order('created_at', { ascending: false })

  const materias = (data ?? []) as MateriaImprensaRow[]

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <PageHeader
        title="Imprensa"
        subtitle="Links de matérias e notícias onde a ADTRISC foi citada"
      />

      <Card className="mb-6">
        <MateriaForm />
      </Card>

      {materias.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            icon={Newspaper}
            title="Nenhum link cadastrado"
            description="Cole acima o link de uma matéria para adicioná-la aqui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materias.map((m) => (
            <MateriaCard key={m.id} materia={m} />
          ))}
        </div>
      )}
    </div>
  )
}
