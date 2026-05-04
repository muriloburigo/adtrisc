import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import DeleteUserButton from './DeleteUserButton'
import { Pencil } from 'lucide-react'
import type { ProfileRow, UserRole } from '@/types/database'

export default async function ConfiguracoesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) redirect('/login')

  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', me.id).single()
  const profile = profileRaw as { role: UserRole } | null
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: usersRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('role')

  const users = (usersRaw ?? []) as ProfileRow[]

  const roleLabel: Record<UserRole, string> = {
    admin: 'Administrador(a)', coach: 'Treinador(a)', aluno: 'Atleta', pai: 'Responsável',
  }
  const roleBadge: Record<UserRole, 'blue' | 'sky' | 'green' | 'gray'> = {
    admin: 'blue', coach: 'sky', aluno: 'green', pai: 'gray',
  }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Configurações"
        subtitle={`${users.length} usuário${users.length !== 1 ? 's' : ''} no sistema`}
      />

      <Card padding={false}>
        {/* Desktop: table */}
        <table className="hidden md:table w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">E-mail</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Perfil</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3.5 font-medium text-navy-500">
                  {u.full_name ?? '—'}
                  {u.id === me.id && (
                    <span className="ml-2 text-[10px] bg-sky-100 text-sky-600 font-semibold px-1.5 py-0.5 rounded-full">você</span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-gray-500">{u.email}</td>
                <td className="px-6 py-3.5">
                  <Badge variant={roleBadge[u.role] ?? 'gray'}>{roleLabel[u.role] ?? u.role}</Badge>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/configuracoes/${u.id}/editar`}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} /> Editar
                    </Link>
                    {u.id !== me.id && (
                      <DeleteUserButton userId={u.id} nome={u.full_name ?? u.email ?? ''} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile: cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="px-4 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-navy-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(u.full_name ?? u.email ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-navy-500 text-sm truncate">{u.full_name ?? '—'}</p>
                  {u.id === me.id && (
                    <span className="text-[10px] bg-sky-100 text-sky-600 font-semibold px-1.5 py-0.5 rounded-full">você</span>
                  )}
                  <Badge variant={roleBadge[u.role] ?? 'gray'}>{roleLabel[u.role] ?? u.role}</Badge>
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Link
                    href={`/configuracoes/${u.id}/editar`}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-navy-500 px-2 py-1 rounded-lg border border-gray-200 hover:border-navy-300 transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </Link>
                  {u.id !== me.id && (
                    <DeleteUserButton userId={u.id} nome={u.full_name ?? u.email ?? ''} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
