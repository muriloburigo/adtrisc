import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import PresencaSelector from './PresencaSelector'
import type { TurmaRow } from '@/types/database'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

export default async function PresencasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id).single()

  let query = supabase
    .from('turmas')
    .select('id, nome, modalidade')
    .eq('status', 'ativa')
    .order('nome')

  if (profile?.role === 'coach') {
    query = query.eq('coach_id', user?.id)
  }

  const { data: turmasRaw } = await query
  const turmas = (turmasRaw ?? []) as TurmaBasic[]

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Lista de Presença"
        subtitle="Selecione a turma e a data da aula"
      />

      <Card>
        {turmas.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Nenhuma turma ativa encontrada.
          </p>
        ) : (
          <PresencaSelector turmas={turmas} />
        )}
      </Card>
    </div>
  )
}
