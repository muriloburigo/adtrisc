import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { createCoach } from '../actions'

export default function NovoCoachPage() {
  return (
    <div className="p-8 max-w-lg">
      <PageHeader title="Novo(a) Treinador(a)" subtitle="Cria um acesso no sistema para o/a treinador(a)" />
      <Card>
        <form action={createCoach} className="space-y-5">
          <Input
            label="Nome completo"
            name="full_name"
            placeholder="Nome do(a) treinador(a)"
            required
          />
          <Input
            label="E-mail"
            name="email"
            type="email"
            placeholder="treinador@email.com"
            required
          />
          <Input
            label="Senha inicial"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
            hint="O/A treinador(a) poderá alterar após o primeiro acesso"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit">Cadastrar Treinador(a)</Button>
            <Link href="/coaches">
              <Button type="button" variant="secondary">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
