import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import UserEditForm from './UserEditForm'
import type { ProfileRow, UserRole } from '@/types/database'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) redirect('/login')
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', me.id).single()
  if (myProfile?.role !== 'admin') redirect('/dashboard')

  const { data: raw } = await supabase.from('profiles').select('id, full_name, email, role').eq('id', id).single()
  if (!raw) notFound()

  const profile = raw as Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'role'>

  return (
    <div className="p-4 sm:p-8 max-w-lg">
      <BackButton />

      <PageHeader title="Editar usuário" subtitle={profile.email ?? ''} />

      <Card>
        <UserEditForm
          userId={profile.id}
          defaultName={profile.full_name ?? ''}
          defaultRole={profile.role as UserRole}
          email={profile.email ?? ''}
        />
      </Card>
    </div>
  )
}
