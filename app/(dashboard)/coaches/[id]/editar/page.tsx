import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import ResetPasswordForm from './ResetPasswordForm'
import CoachAvatarCard from './CoachAvatarCard'
import { updateCoach } from '../../actions'
import type { ProfileRow } from '@/types/database'

export default async function EditarCoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: coachRaw } = await supabase
    .from('profiles').select('*').eq('id', id).eq('role', 'coach').single()

  if (!coachRaw) notFound()

  const coach  = coachRaw as ProfileRow
  const update = updateCoach.bind(null, id)

  return (
    <div className="p-4 sm:p-8 max-w-lg space-y-6">
      <PageHeader title="Editar Treinador(a)" subtitle={coach.full_name ?? ''} />

      {/* Foto */}
      <CoachAvatarCard
        coachId={id}
        currentUrl={coach.avatar_url}
        name={coach.full_name ?? 'T'}
      />

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
            <Link href={`/coaches/${id}`}>
              <Button type="button" variant="secondary">Cancelar</Button>
            </Link>
          </div>
        </form>
      </Card>

      {/* Redefinir senha */}
      <Card>
        <h3 className="text-sm font-semibold text-navy-500 mb-1">Redefinir senha</h3>
        <p className="text-xs text-gray-400 mb-4">Define uma nova senha para o acesso do/da treinador(a)</p>
        <ResetPasswordForm coachId={id} />
      </Card>
    </div>
  )
}
