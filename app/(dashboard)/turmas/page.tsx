import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusTurmaVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { Users2, Plus, Clock, Users } from 'lucide-react'
import { formatarDiasSemana, formatarHorario, formatFaixaEtaria, formatSemestre } from '@/lib/utils'
import type { DiaSemana } from '@/types/database'

export default async function TurmasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const filters    = await searchParams
  const q          = filters.q          ?? ''
  const modalidade = filters.modalidade ?? ''
  const status     = filters.status     ?? ''
  const ano        = filters.ano        ?? ''
  const semestre   = filters.semestre   ?? ''

  const supabase = await createClient()

  let query = supabase
    .from('turmas')
    .select('*, coaches:coach_id ( full_name )')
    .order('nome')

  if (modalidade) query = query.eq('modalidade', modalidade)
  if (status)     query = query.eq('status', status)
  if (ano)        query = query.eq('ano', parseInt(ano))
  if (semestre)   query = query.eq('semestre', parseInt(semestre))

  const { data } = await query

  type TurmaRow = {
    id: string; nome: string; modalidade: string; status: string
    dias_semana: DiaSemana[]; horario_inicio: string; horario_fim: string
    capacidade: number; coaches: { full_name: string | null } | null
    ano: number | null; semestre: number | null
    idade_min: number | null; idade_max: number | null
  }

  let turmas = (data ?? []) as unknown as TurmaRow[]

  if (q) {
    const lower = q.toLowerCase()
    turmas = turmas.filter((t) => t.nome.toLowerCase().includes(lower))
  }

  // Collect unique anos from all records (unfiltered) for the ano dropdown
  const { data: anosRaw } = await supabase
    .from('turmas')
    .select('ano')
    .not('ano', 'is', null)
    .order('ano', { ascending: false })

  const anosUnicos = [...new Set((anosRaw ?? []).map((r: { ano: number }) => r.ano))].filter(Boolean) as number[]
  const anoOptions = anosUnicos.map((a) => ({ value: String(a), label: String(a) }))

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar por nome…' },
    {
      type: 'select' as const,
      key: 'modalidade',
      placeholder: 'Todas as modalidades',
      options: [
        { value: 'natacao',   label: 'Natação'   },
        { value: 'ciclismo',  label: 'Ciclismo'  },
        { value: 'corrida',   label: 'Corrida'   },
        { value: 'triathlon', label: 'Triathlon' },
      ],
    },
    {
      type: 'select' as const,
      key: 'status',
      placeholder: 'Todos os status',
      options: [
        { value: 'ativa',    label: 'Ativa'    },
        { value: 'inativa',  label: 'Inativa'  },
        { value: 'suspensa', label: 'Suspensa' },
      ],
    },
    ...(anoOptions.length > 0
      ? [{ type: 'select' as const, key: 'ano', placeholder: 'Todos os anos', options: anoOptions }]
      : []),
    {
      type: 'select' as const,
      key: 'semestre',
      placeholder: 'Ambos os semestres',
      options: [
        { value: '1', label: '1º Semestre' },
        { value: '2', label: '2º Semestre' },
      ],
    },
  ]

  const initialValues = { q, modalidade, status, ano, semestre }

  return (
    <div className="p-8">
      <PageHeader
        title="Turmas"
        subtitle={`${turmas.length} turma${turmas.length !== 1 ? 's' : ''} encontrada${turmas.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/turmas/nova">
            <Button><Plus size={16} />Nova Turma</Button>
          </Link>
        }
      />

      <FilterBar fields={filterFields} initialValues={initialValues} />

      {turmas.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users2}
            title="Nenhuma turma encontrada"
            description={q || modalidade || status || ano || semestre ? 'Tente ajustar os filtros' : 'Crie a primeira turma para começar'}
            action={
              !q && !modalidade && !status && !ano && !semestre
                ? <Link href="/turmas/nova"><Button><Plus size={16} />Nova Turma</Button></Link>
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {turmas.map((t) => (
            <Link key={t.id} href={`/turmas/${t.id}`}>
              <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-navy-500">{t.nome}</h3>
                  <Badge variant={statusTurmaVariant(t.status)}>
                    {t.status}
                  </Badge>
                </div>

                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{t.modalidade}</p>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-sky-400" />
                    <span>
                      {formatarDiasSemana(t.dias_semana)} · {formatarHorario(t.horario_inicio)}–{formatarHorario(t.horario_fim)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-sky-400" />
                    <span>Cap. {t.capacidade} atletas</span>
                  </div>
                </div>

                {(t.ano || t.semestre || t.idade_min || t.idade_max) && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.ano && (
                      <span className="text-xs bg-navy-50 text-navy-500 font-medium px-2 py-0.5 rounded-full">
                        {t.ano}
                      </span>
                    )}
                    {formatSemestre(t.semestre) && (
                      <span className="text-xs bg-sky-50 text-sky-500 font-medium px-2 py-0.5 rounded-full">
                        {formatSemestre(t.semestre)}
                      </span>
                    )}
                    {formatFaixaEtaria(t.idade_min, t.idade_max) && (
                      <span className="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                        {formatFaixaEtaria(t.idade_min, t.idade_max)}
                      </span>
                    )}
                  </div>
                )}

                {t.coaches?.full_name && (
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                    Treinador(a): {t.coaches.full_name}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
