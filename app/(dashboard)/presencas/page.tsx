import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { Users2, History } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import PresencaSelector from './PresencaSelector'
import type { TurmaRow } from '@/types/database'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

type SessaoRecente = {
  turma_id: string
  data: string
  turma_nome: string
  total: number
  presentes: number
}

export default async function PresencasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id).single()

  let turmasQuery = supabase
    .from('turmas')
    .select('id, nome, modalidade')
    .eq('status', 'ativa')
    .order('nome')

  if (profile?.role === 'coach') {
    turmasQuery = turmasQuery.eq('coach_id', user?.id)
  }

  const { data: turmasRaw } = await turmasQuery
  const turmas = (turmasRaw ?? []) as TurmaBasic[]

  // Últimas sessões registradas
  const { data: sessoesRaw } = await supabase
    .from('presencas')
    .select('turma_id, data, presente, turmas!inner(nome)')
    .order('data', { ascending: false })
    .limit(200)

  // Agrupar por (turma_id, data)
  const sessaoMap = new Map<string, SessaoRecente>()
  for (const row of sessoesRaw ?? []) {
    const key = `${row.turma_id}__${row.data}`
    if (!sessaoMap.has(key)) {
      sessaoMap.set(key, {
        turma_id: row.turma_id,
        data: row.data,
        turma_nome: row.turmas?.nome ?? '—',
        total: 0,
        presentes: 0,
      })
    }
    const s = sessaoMap.get(key)!
    s.total++
    if (row.presente) s.presentes++
  }

  // Ordenar por data desc, pegar as 8 mais recentes únicas
  const sessoes = [...sessaoMap.values()]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 8)

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <PageHeader title="Presenças" subtitle="Registre a frequência das aulas" />

      {/* Selector principal */}
      <Card>
        <h2 className="text-sm font-semibold text-navy-500 mb-4">Nova lista de presença</h2>
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
          <PresencaSelector turmas={turmas} />
        )}
      </Card>

      {/* Histórico recente */}
      {sessoes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={15} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-navy-500">Sessões recentes</h2>
          </div>
          <div className="space-y-2">
            {sessoes.map((s) => {
              const pct = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0
              return (
                <Link
                  key={`${s.turma_id}__${s.data}`}
                  href={`/presencas/${s.turma_id}/${s.data}`}
                >
                  <Card className="hover:border-sky-400 transition-colors cursor-pointer py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-navy-500">{s.turma_nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.data)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-navy-500">
                          {s.presentes}/{s.total}
                        </p>
                        <p className={`text-xs font-medium ${pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                          {pct}% presença
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
