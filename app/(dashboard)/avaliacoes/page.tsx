import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { Users2 } from 'lucide-react'
import Link from 'next/link'
import AvaTurmaSelector from './AvaTurmaSelector'
import type { TurmaRow } from '@/types/database'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

export default async function AvaliacoesHubPage() {
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
    <div className="p-8 max-w-2xl space-y-8">
      <PageHeader
        title="Avaliações — Campo"
        subtitle="Coleta por critério · preencha todos os atletas antes de avançar"
      />

      <Card>
        <h2 className="text-sm font-semibold text-navy-500 mb-4">Selecionar turma e data</h2>
        {turmas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Users2 size={32} className="text-gray-200" />
            <div>
              <p className="text-sm font-medium text-gray-500">Nenhuma turma ativa encontrada</p>
              <p className="text-xs text-gray-400 mt-1">
                Cadastre turmas em{' '}
                <Link href="/turmas/nova" className="text-sky-400 underline">
                  Turmas → Nova turma
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <AvaTurmaSelector turmas={turmas} />
        )}
      </Card>
    </div>
  )
}
