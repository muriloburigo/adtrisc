import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import PresencaSelector from './PresencaSelector'
import DeletePresencaButton from './DeletePresencaButton'
import { ClipboardCheck, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import type { TurmaRow } from '@/types/database'

export const dynamic = 'force-dynamic'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

type Sessao = {
  turma_id: string
  data: string
  turma_nome: string
  total: number
  presentes: number
  justificadas: number
}

const MESES_OPTIONS = [
  { value: '1',  label: 'Janeiro'   },
  { value: '2',  label: 'Fevereiro' },
  { value: '3',  label: 'Março'     },
  { value: '4',  label: 'Abril'     },
  { value: '5',  label: 'Maio'      },
  { value: '6',  label: 'Junho'     },
  { value: '7',  label: 'Julho'     },
  { value: '8',  label: 'Agosto'    },
  { value: '9',  label: 'Setembro'  },
  { value: '10', label: 'Outubro'   },
  { value: '11', label: 'Novembro'  },
  { value: '12', label: 'Dezembro'  },
]

function gerarAnosOptions() {
  const ano = new Date().getFullYear()
  return [ano, ano - 1, ano - 2, ano - 3].map((a) => ({ value: String(a), label: String(a) }))
}

export default async function PresencasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id).single()

  const filters = await searchParams
  const turmaFilter = filters.turma ?? ''
  const anoFilter   = filters.ano   ?? ''
  const mesFilter   = filters.mes   ?? ''
  const saved       = filters.saved === '1'

  // Turmas para o seletor e para o filtro
  let turmasQuery = supabase
    .from('turmas').select('id, nome, modalidade').eq('status', 'ativa').order('nome')
  if (profile?.role === 'coach') {
    const turmaIdsCoach = await getTurmaIdsForCoach(supabase, user?.id)
    turmasQuery = turmasQuery.in('id', turmaIdsCoach.length > 0 ? turmaIdsCoach : ['__none__'])
  }
  const { data: turmasRaw } = await turmasQuery
  const turmas = (turmasRaw ?? []) as TurmaBasic[]

  // Histórico de presenças
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let histQuery: any = supabase
    .from('presencas')
    .select('turma_id, data, presente, justificada, turmas!inner(nome)')
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(500)

  if (turmaFilter) histQuery = histQuery.eq('turma_id', turmaFilter)

  if (anoFilter) {
    histQuery = histQuery
      .gte('data', `${anoFilter}-01-01`)
      .lte('data', `${anoFilter}-12-31`)
  }

  // Para coaches: restringir ao histórico das suas turmas
  if (profile?.role === 'coach') {
    const ids = turmas.map((t) => t.id)
    if (ids.length > 0) histQuery = histQuery.in('turma_id', ids)
  }

  const { data: rows } = await histQuery

  // Agrupar por (turma_id, data)
  const sessaoMap = new Map<string, Sessao>()
  for (const row of rows ?? []) {
    const key = `${row.turma_id}__${row.data}`
    if (!sessaoMap.has(key)) {
      sessaoMap.set(key, {
        turma_id:   row.turma_id,
        data:       row.data,
        turma_nome: (row.turmas as { nome: string } | null)?.nome ?? '—',
        total: 0, presentes: 0, justificadas: 0,
      })
    }
    const s = sessaoMap.get(key)!
    s.total++
    if (row.presente) s.presentes++
    else if (row.justificada) s.justificadas++
  }

  let sessoes = [...sessaoMap.values()].sort((a, b) => b.data.localeCompare(a.data))

  if (mesFilter) {
    sessoes = sessoes.filter((s) => String(Number(s.data.slice(5, 7))) === mesFilter)
  }

  // Filtros
  const filterFields = [
    {
      type: 'select' as const, key: 'turma', placeholder: 'Todas as turmas',
      options: turmas.map((t) => ({ value: t.id, label: t.nome })),
    },
    {
      type: 'select' as const, key: 'ano', placeholder: 'Todos os anos',
      options: gerarAnosOptions(),
    },
    {
      type: 'select' as const, key: 'mes', placeholder: 'Todos os meses',
      options: MESES_OPTIONS,
    },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-6">
      <PageHeader
        title="Presenças"
        subtitle="Registre e consulte a frequência das aulas"
      />

      {/* Banner de sucesso */}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} className="flex-shrink-0" />
          Lista de presença salva com sucesso.
        </div>
      )}

      {/* Seletor */}
      <Card>
        <h2 className="text-sm font-semibold text-navy-500 mb-4">Abrir lista de presença</h2>
        {turmas.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Nenhuma turma ativa encontrada.</p>
        ) : (
          <PresencaSelector turmas={turmas} />
        )}
      </Card>

      {/* Histórico */}
      <div>
        <h2 className="text-sm font-semibold text-navy-500 mb-3">
          Histórico
          {sessoes.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {sessoes.length} sessão{sessoes.length !== 1 ? 'ões' : ''} encontrada{sessoes.length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>

        <FilterBar fields={filterFields} initialValues={{ turma: turmaFilter, ano: anoFilter, mes: mesFilter }} />

        <Card padding={false}>
          {sessoes.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma sessão encontrada"
              description={turmaFilter || anoFilter || mesFilter ? 'Tente ajustar os filtros.' : 'As listas de presença salvas aparecerão aqui.'}
            />
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Data</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Turma</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Presentes</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Faltas</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Justif.</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">% Presença</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessoes.map((s) => {
                    const faltas = s.total - s.presentes - s.justificadas
                    const pct = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0
                    const pctColor = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'
                    return (
                      <tr key={`${s.turma_id}__${s.data}`} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5 text-gray-500 font-mono text-xs whitespace-nowrap">
                          {formatDate(s.data)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-navy-500">{s.turma_nome}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            {s.presentes}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold ${faltas > 0 ? 'bg-red-50 text-red-600' : 'text-gray-300'}`}>
                            {faltas}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md text-xs font-semibold ${s.justificadas > 0 ? 'bg-amber-50 text-amber-600' : 'text-gray-300'}`}>
                            {s.justificadas}
                          </span>
                        </td>
                        <td className={`px-4 py-3.5 text-center font-bold text-sm ${pctColor}`}>
                          {pct}%
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <DeletePresencaButton
                              turmaId={s.turma_id}
                              data={s.data}
                              turmaNome={s.turma_nome}
                              variant="icon"
                            />
                            <Link
                              href={`/presencas/${s.turma_id}/${s.data}`}
                              className="text-xs text-sky-500 hover:text-sky-600 font-medium whitespace-nowrap"
                            >
                              Ver / Editar →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {sessoes.map((s) => {
                  const faltas = s.total - s.presentes - s.justificadas
                  const pct = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0
                  const pctColor = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'
                  return (
                    <div key={`${s.turma_id}__${s.data}`} className="flex items-center gap-3 px-4 py-4">
                      <Link
                        href={`/presencas/${s.turma_id}/${s.data}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-500 truncate">{s.turma_nome}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.data)}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-emerald-600 font-medium">{s.presentes} presentes</span>
                            {faltas > 0 && (
                              <span className="text-xs text-red-500 font-medium">{faltas} falta{faltas !== 1 ? 's' : ''}</span>
                            )}
                            {s.justificadas > 0 && (
                              <span className="text-xs text-amber-500 font-medium">{s.justificadas} justif.</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`text-lg font-bold ${pctColor}`}>{pct}%</p>
                          <p className="text-xs text-gray-400">{s.total} alunos</p>
                        </div>
                      </Link>
                      <DeletePresencaButton
                        turmaId={s.turma_id}
                        data={s.data}
                        turmaNome={s.turma_nome}
                        variant="icon"
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
