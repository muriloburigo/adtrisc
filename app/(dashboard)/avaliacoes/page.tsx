import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import AvaTurmaSelector from './AvaTurmaSelector'
import DeleteAvaliacaoButton from './DeleteAvaliacaoButton'
import { Dumbbell, Users2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import type { TurmaRow } from '@/types/database'

export const dynamic = 'force-dynamic'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

type SessaoAva = {
  turma_id: string
  turma_nome: string
  data: string
  avaliados: number
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

export default async function AvaliacoesHubPage({
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

  // Turmas
  let turmasQuery = supabase
    .from('turmas').select('id, nome, modalidade').eq('status', 'ativa').order('nome')
  if (profile?.role === 'coach') {
    const turmaIdsCoach = await getTurmaIdsForCoach(supabase, user?.id)
    turmasQuery = turmasQuery.in('id', turmaIdsCoach.length > 0 ? turmaIdsCoach : ['__none__'])
  }
  const { data: turmasRaw } = await turmasQuery
  const turmas = (turmasRaw ?? []) as TurmaBasic[]
  const turmaIds = turmas.map((t) => t.id)

  // Alunos for these turmas (needed for grouping by turma_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: alunosRaw } = await supabase
    .from('alunos').select('id, turma_id')
    .in('turma_id', turmaIds.length > 0 ? turmaIds : ['__none__'])
  const alunosTurmaMap: Record<string, string> = {}
  for (const a of alunosRaw ?? []) alunosTurmaMap[a.id] = a.turma_id
  const turmaNomeMap: Record<string, string> = {}
  for (const t of turmas) turmaNomeMap[t.id] = t.nome

  // Build the aluno_id list to filter evaluations
  let alunoIdsFiltro: string[]
  if (turmaFilter) {
    alunoIdsFiltro = (alunosRaw ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.turma_id === turmaFilter)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.id)
  } else {
    alunoIdsFiltro = Object.keys(alunosTurmaMap)
  }

  // Histórico de avaliações
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let histQuery: any = supabase
    .from('avaliacoes_fisicas')
    .select('aluno_id, data')
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(2000)
    .in('aluno_id', alunoIdsFiltro.length > 0 ? alunoIdsFiltro : ['__none__'])

  if (anoFilter) {
    histQuery = histQuery
      .gte('data', `${anoFilter}-01-01`)
      .lte('data', `${anoFilter}-12-31`)
  }

  const { data: rows } = await histQuery

  // Agrupar por (turma_id, data)
  const sessaoMap = new Map<string, SessaoAva>()
  for (const row of rows ?? []) {
    const turmaId = alunosTurmaMap[row.aluno_id]
    if (!turmaId) continue
    const key = `${turmaId}__${row.data}`
    if (!sessaoMap.has(key)) {
      sessaoMap.set(key, {
        turma_id:   turmaId,
        turma_nome: turmaNomeMap[turmaId] ?? '—',
        data:       row.data,
        avaliados:  0,
      })
    }
    sessaoMap.get(key)!.avaliados++
  }

  let sessoes = [...sessaoMap.values()].sort((a, b) => b.data.localeCompare(a.data))

  if (mesFilter) {
    sessoes = sessoes.filter((s) => String(Number(s.data.slice(5, 7))) === mesFilter)
  }

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
        title="Avaliações — Campo"
        subtitle="Registre e consulte as avaliações físicas"
      />

      {/* Seletor */}
      <Card>
        <h2 className="text-sm font-semibold text-navy-500 mb-4">Iniciar avaliação</h2>
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
              icon={Dumbbell}
              title="Nenhuma avaliação encontrada"
              description={turmaFilter || anoFilter || mesFilter ? 'Tente ajustar os filtros.' : 'As avaliações salvas aparecerão aqui.'}
            />
          ) : (
            <>
              {/* Desktop */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-gray-500 font-medium whitespace-nowrap">Data</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Turma</th>
                    <th className="text-center px-4 py-3 text-gray-500 font-medium">Avaliados</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessoes.map((s) => (
                    <tr key={`${s.turma_id}__${s.data}`} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs whitespace-nowrap">
                        {formatDate(s.data)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-navy-500">{s.turma_nome}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-sky-50 text-sky-700 text-xs font-semibold">
                          {s.avaliados}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <DeleteAvaliacaoButton
                            turmaId={s.turma_id}
                            data={s.data}
                            turmaNome={s.turma_nome}
                            variant="icon"
                          />
                          <Link
                            href={`/avaliacoes/${s.turma_id}/${s.data}`}
                            className="text-xs text-sky-500 hover:text-sky-600 font-medium whitespace-nowrap"
                          >
                            Ver / Editar →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-gray-100">
                {sessoes.map((s) => (
                  <div key={`${s.turma_id}__${s.data}`} className="flex items-center gap-3 px-4 py-4">
                    <Link
                      href={`/avaliacoes/${s.turma_id}/${s.data}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy-500 truncate">{s.turma_nome}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.data)}</p>
                        <p className="text-xs text-sky-600 font-medium mt-1">{s.avaliados} avaliado{s.avaliados !== 1 ? 's' : ''}</p>
                      </div>
                      <Dumbbell size={16} className="flex-shrink-0 text-gray-300" />
                    </Link>
                    <DeleteAvaliacaoButton
                      turmaId={s.turma_id}
                      data={s.data}
                      turmaNome={s.turma_nome}
                      variant="icon"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
