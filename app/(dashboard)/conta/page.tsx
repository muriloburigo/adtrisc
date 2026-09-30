import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { formatRole } from '@/lib/utils'
import TrocarSenhaForm from './TrocarSenhaForm'

export default async function MinhaContaPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: p } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  return (
    <div className="p-4 sm:p-8 max-w-2xl space-y-6">
      <PageHeader title="Minha conta" subtitle={`${p?.full_name ?? ''} · ${user.email}${p?.role ? ` · ${formatRole(p.role)}` : ''}`} />
      <Card>
        <h2 className="text-sm font-semibold text-navy-500 mb-4">Alterar senha</h2>
        <TrocarSenhaForm />
      </Card>
    </div>
  )
}
