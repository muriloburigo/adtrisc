import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import CoachForm from './CoachForm'

export default function NovoCoachPage() {
  return (
    <div className="p-4 sm:p-8 max-w-lg">
      <PageHeader title="Novo(a) Treinador(a)" subtitle="Cria um acesso no sistema para o/a treinador(a)" />
      <Card>
        <CoachForm />
      </Card>
    </div>
  )
}
