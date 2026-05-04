import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { UserCheck } from 'lucide-react'

export default async function CoachesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'coach')
    .order('full_name')

  type CoachRow = { id: string; full_name: string | null; email: string }
  const coaches = (data ?? []) as CoachRow[]

  return (
    <div className="p-8">
      <PageHeader
        title="Coaches"
        subtitle={`${coaches.length} coach${coaches.length !== 1 ? 'es' : ''} cadastrado${coaches.length !== 1 ? 's' : ''}`}
      />

      {coaches.length === 0 ? (
        <Card>
          <EmptyState icon={UserCheck} title="Nenhum coach cadastrado" description="Adicione coaches via Configurações" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coaches.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-400 font-bold text-sm flex-shrink-0">
                  {c.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-navy-500">{c.full_name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
