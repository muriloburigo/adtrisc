import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { Tag } from 'lucide-react'
import FinanceiroTabs from '../FinanceiroTabs'
import CategoriaRow from '@/components/financeiro/CategoriaRow'
import NovaCategoriaForm from '@/components/financeiro/NovaCategoriaForm'
import type { CategoriaFinanceiraRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function CategoriasFinanceirasPage() {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: categoriasRaw } = await supabase.from('categorias_financeiras').select('*').order('nome')
  const categorias = (categoriasRaw ?? []) as CategoriaFinanceiraRow[]

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <PageHeader title="Financeiro" subtitle="Categorias de despesa (treinadores, camisetas, viagens...)" />

      <FinanceiroTabs isAdmin />

      <NovaCategoriaForm />

      <Card padding={false}>
        {categorias.length === 0 ? (
          <EmptyState icon={Tag} title="Nenhuma categoria cadastrada" description="Adicione categorias para poder orçar e lançar notas." />
        ) : (
          <div className="divide-y divide-gray-100">
            {categorias.map((c) => (
              <CategoriaRow key={c.id} id={c.id} nome={c.nome} ativo={c.ativo} />
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
