import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { UserCheck, Plus, Users2 } from 'lucide-react'
import type { ProfileRow } from '@/types/database'

export default async function CoachesPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: coachesRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'coach')
    .order('full_name')

  type CoachWithTurmas = ProfileRow & { turma_count?: number }
  const coaches = (coachesRaw ?? []) as CoachWithTurmas[]

  // Conta turmas por coach
  const { data: turmasCounts } = await supabase
    .from('turmas')
    .select('coach_id')
    .eq('status', 'ativa')

  const countMap: Record<string, number> = {}
  for (const t of (turmasCounts ?? []) as { coach_id: string | null }[]) {
    if (t.coach_id) countMap[t.coach_id] = (countMap[t.coach_id] ?? 0) + 1
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Coaches"
        subtitle={`${coaches.length} coach${coaches.length !== 1 ? 'es' : ''} cadastrado${coaches.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/coaches/novo">
            <Button><Plus size={16} />Novo Coach</Button>
          </Link>
        }
      />

      {coaches.length === 0 ? (
        <Card>
          <EmptyState
            icon={UserCheck}
            title="Nenhum coach cadastrado"
            description="Adicione o primeiro treinador"
            action={<Link href="/coaches/novo"><Button><Plus size={16} />Novo Coach</Button></Link>}
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
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                      style={{ background: '#2AABE1' }}
                    >
                      {coach.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
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
