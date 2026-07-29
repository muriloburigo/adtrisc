import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import ResetPasswordForm from './ResetPasswordForm'
import EditarCoachForm from './EditarCoachForm'

export default async function EditarCoachPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  const { id } = await params
  const { data: coach } = await supabase
    .from('profiles')
    .select('id, full_name, email, cref')
    .eq('id', id)
    .eq('role', 'coach')
    .single()

  if (!coach) notFound()

  return (
    <div className="p-4 sm:p-8 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/coaches"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-navy-500">Editar Treinador(a)</h1>
          <p className="text-sm text-gray-400 mt-0.5">{coach.email}</p>
        </div>
      </div>

      <Card>
        <EditarCoachForm id={id} fullName={coach.full_name ?? ''} cref={coach.cref ?? ''} />
      </Card>

      <Card>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Redefinir senha
        </p>
        <ResetPasswordForm coachId={id} />
      </Card>
    </div>
  )
}
