import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import Avatar from '@/components/ui/Avatar'
import DeleteCoachButton from './[id]/DeleteCoachButton'
import { Pencil, Plus, UserCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ProfileRow } from '@/types/database'

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const filters = await searchParams
  const q = filters.q ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, cref, created_at')
    .eq('role', 'coach')
    .order('full_name')

  let coaches = (data ?? []) as ProfileRow[]

  if (q) {
    const lower = q.toLowerCase()
    coaches = coaches.filter((c) =>
      [c.full_name, c.email].filter(Boolean).some((value) => value!.toLowerCase().includes(lower))
    )
  }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Treinadores"
        subtitle={`${coaches.length} treinador${coaches.length !== 1 ? 'es' : ''} encontrado${coaches.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/coaches/novo">
            <Button><Plus size={16} />Novo Treinador</Button>
          </Link>
        }
      />

      <FilterBar fields={[{ type: 'search', key: 'q', placeholder: 'Buscar treinador...' }]} initialValues={{ q }} />

      {coaches.length === 0 ? (
        <Card>
          <EmptyState
            icon={UserCheck}
            title="Nenhum treinador encontrado"
            description={q ? 'Tente ajustar a busca' : 'Crie o primeiro acesso de treinador'}
            action={!q ? <Link href="/coaches/novo"><Button><Plus size={16} />Novo Treinador</Button></Link> : undefined}
          />
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {coaches.map((coach) => {
              const name = coach.full_name ?? coach.email ?? 'Treinador(a)'

              return (
                <div key={coach.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={name} url={coach.avatar_url} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-navy-500 truncate">{name}</p>
                      <Badge variant="sky">Treinador(a)</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {coach.email ?? 'Sem e-mail'}
                      {coach.cref && <span className="text-gray-300"> · CREF {coach.cref}</span>}
                      {' · '}Cadastro em {formatDate(coach.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/coaches/${coach.id}/editar`}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={13} /> Editar
                    </Link>
                    <DeleteCoachButton id={coach.id} name={name} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
