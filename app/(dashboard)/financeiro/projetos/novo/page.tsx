import { requireAdmin } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import ProjetoForm from '@/components/financeiro/ProjetoForm'
import { createProjeto } from '../../actions'

export default async function NovoProjetoPage() {
  await requireAdmin()

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Novo projeto" subtitle="Um projeto define a verba disponível por categoria em um ano" />
      <Card>
        <ProjetoForm action={createProjeto} />
      </Card>
    </div>
  )
}
