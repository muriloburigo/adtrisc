import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import MobileHeader from '@/components/layout/MobileHeader'
import { createAdminClient } from '@/lib/supabase/admin'
import { pendenciasDoUsuario } from '@/lib/transferencias'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Transferências de atletas aguardando resposta deste usuário (número no menu "Atletas").
  const role = (profile as { role?: string } | null)?.role
  // Atleta usa o portal; o painel é da equipe.
  if (role === 'aluno') redirect('/portal')
  const pendencias = role === 'admin' || role === 'coach'
    ? (await pendenciasDoUsuario(createAdminClient(), user.id, role === 'admin')).paraResponder.length
    : 0

  return (
    <div className="flex h-screen h-[100svh] bg-gray-50 print:h-auto print:block">
      <Sidebar user={profile} pendencias={pendencias} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden print:overflow-visible">
        <MobileHeader user={profile} pendencias={pendencias} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0 print:overflow-visible print:h-auto print:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}
