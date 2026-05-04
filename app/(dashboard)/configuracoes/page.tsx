import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { ProfileRow, UserRole } from '@/types/database'

export default async function ConfiguracoesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const profile = profileRaw as { role: UserRole } | null
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: usersRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('role')

  const users = (usersRaw ?? []) as ProfileRow[]

  const roleLabel: Record<UserRole, string> = {
    admin: 'Admin', coach: 'Coach', aluno: 'Aluno', pai: 'Pai/Mãe',
  }
  const roleBadge: Record<UserRole, 'blue' | 'sky' | 'green' | 'gray'> = {
    admin: 'blue', coach: 'sky', aluno: 'green', pai: 'gray',
  }

  return (
    <div className="p-8">
      <PageHeader title="Configurações" subtitle="Gestão de usuários do sistema" />

      <Card padding={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3.5 font-medium text-navy-500">{u.full_name ?? '—'}</td>
                <td className="px-6 py-3.5 text-gray-500">{u.email}</td>
                <td className="px-6 py-3.5">
                  <Badge variant={roleBadge[u.role] ?? 'gray'}>{roleLabel[u.role] ?? u.role}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
