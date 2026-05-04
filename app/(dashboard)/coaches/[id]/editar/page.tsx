import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { updateCoach, resetPassword } from '../../actions'
import type { ProfileRow } from '@/types/database'

export default async function EditarCoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: coachRaw } = await supabase
    .from('profiles').select('*').eq('id', id).eq('role', 'coach').single()

  if (!coachRaw) notFound()

  const coach = coachRaw as ProfileRow
  const update = updateCoach.bind(null, id)
  const reset  = resetPassword.bind(null, id)

  return (
    <div className="p-8 max-w-lg space-y-6">
      <PageHeader title="Editar Coach" subtitle={coach.full_name ?? ''} />

      {/* Dados principais */}
      <Card>
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Dados pessoais</h3>
        <form action={update} className="space-y-4">
          <Input
            label="Nome completo"
            name="full_name"
            defaultValue={coach.full_name ?? ''}
            required
          />
          <Input
            label="E-mail"
            name="email"
            type="email"
            defaultValue={coach.email}
            required
          />
          <div className="flex gap-3 pt-1">
            <Button type="submit">Salvar alterações</Button>
            <Button type="button" variant="secondary" onClick={() => history.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>

      {/* Redefinir senha */}
      <Card>
        <h3 className="text-sm font-semibold text-navy-500 mb-1">Redefinir senha</h3>
        <p className="text-xs text-gray-400 mb-4">Define uma nova senha para o acesso do coach</p>
        <form action={reset} className="space-y-4">
          <Input
            label="Nova senha"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            required
          />
          <Button type="submit" variant="secondary">Redefinir senha</Button>
        </form>
      </Card>
    </div>
  )
}
