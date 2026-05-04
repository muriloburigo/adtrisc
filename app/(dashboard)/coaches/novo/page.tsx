import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createCoach } from '../actions'

export default function NovoCoachPage() {
  return (
    <div className="p-8 max-w-lg">
      <PageHeader title="Novo Coach" subtitle="Cria um acesso no sistema para o treinador" />
      <Card>
        <form action={createCoach} className="space-y-5">
          <Input
            label="Nome completo"
            name="full_name"
            placeholder="Nome do coach"
            required
          />
          <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="coach@email.com"
            required
          />
          <Input
            label="Senha inicial"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            hint="O coach poderá alterar depois de entrar no sistema"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit">Criar Coach</Button>
            <Link href="/coaches">
              <Button type="button" variant="secondary">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
