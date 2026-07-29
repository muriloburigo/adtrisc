import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import TurmaForm from '@/components/turmas/TurmaForm'
import BackButton from '@/components/ui/BackButton'
import { createTurma } from '../actions'

export default async function NovaTurmaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) redirect('/login')
  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', me.id).single()
  if (profileRaw?.role !== 'admin') redirect('/dashboard')

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'coach')
    .order('full_name')

  const coaches = (data ?? []) as { id: string; full_name: string | null }[]

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Nova Turma" subtitle="Preencha os dados da turma" />
      <Card>
        <TurmaForm action={createTurma} coaches={coaches} auxiliaryCoachIds={[]} submitLabel="Criar Turma" />
      </Card>
    </div>
  )
}
