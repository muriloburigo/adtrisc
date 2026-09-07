import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import ProvaForm from '@/components/provas/ProvaForm'
import { createProva } from '../actions'

export default function NovaProvaPage() {
  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Nova Prova" subtitle="Cadastre uma competição e suas categorias" />
      <Card>
        <ProvaForm action={createProva} />
      </Card>
    </div>
  )
}
