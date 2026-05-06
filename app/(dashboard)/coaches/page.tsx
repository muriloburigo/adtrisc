import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import Avatar from '@/components/ui/Avatar'
import { UserCheck, Plus, Users2 } from 'lucide-react'
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

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, created_at')
    .eq('role', 'coach')
    .order('full_name')

  const { data: coachesRaw } = await query

  type CoachWithTurmas = ProfileRow & { turma_count?: number }
  let coaches = (coachesRaw ?? []) as CoachWithTurmas[]

  if (q) {
    const lower = q.toLowerCase()
    coaches = coaches.filter(
      (c) =>
        (c.full_name ?? '').toLowerCase().includes(lower) ||
        (c.email ?? '').toLowerCase().includes(lower),
    )
  }

  const { data: turmasCounts } = await supabase
    .from('turmas')
    .select('coach_id')
    .eq('status', 'ativa')

  const countMap: Record<string, number> = {}
  for (const t of (turmasCounts ?? []) as { coach_id: string | null }[]) {
    if (t.coach_id) countMap[t.coach_id] = (countMap[t.coach_id] ?? 0) + 1
  }

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar por nome ou e-mail…' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Treinadores"
        subtitle={`${coaches.length} ${coaches.length === 1 ? 'treinador(a) encontrado(a)' : 'treinadores encontrados'}`}
        action={
          <Link href="/coaches/novo">
            <Button><Plus size={16} />Novo(a) Treinador(a)</Button>
          </Link>
        }
      />

      <FilterBar fields={filterFields} initialValues={{ q }} />

      {coaches.length === 0 ? (
        <Card>
          <EmptyState
            icon={UserCheck}
            title={q ? 'Nenhum(a) treinador(a) encontrado(a)' : 'Nenhum(a) treinador(a) cadastrado(a)'}
            description={q ? 'Tente ajustar os filtros' : 'Cadastre o/a primeiro(a) treinador(a)'}
            action={
              !q
                ? <Link href="/coaches/novo"><Button><Plus size={16} />Novo(a) Treinador(a)</Button></Link>
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((coach) => {
            const turmas = countMap[coach.id] ?? 0
            return (
              <Link key={coach.id} href={`/coaches/${coach.id}`}>
                <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={coach.full_name ?? '?'} url={coach.avatar_url} size={44} />
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-500 truncate">{coach.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{coach.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users2 size={13} className="text-sky-400" />
                    {turmas === 0 ? 'Sem turmas ativas' : `${turmas} turma${turmas !== 1 ? 's' : ''} ativa${turmas !== 1 ? 's' : ''}`}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
