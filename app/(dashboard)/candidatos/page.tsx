import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { UserPlus } from 'lucide-react'
import { calcularIdade, formatDate, formatTelefone } from '@/lib/utils'
import type { CandidatoRow, UserRole } from '@/types/database'

type CandidatoWithTurma = CandidatoRow & {
  turmas: { nome: string } | null
}

function statusVariant(status: string) {
  if (status === 'sorteado') return 'green'
  if (status === 'em_espera') return 'yellow'
  if (status === 'cancelado') return 'red'
  return 'gray'
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    inscrito: 'Inscrito',
    sorteado: 'Sorteado',
    em_espera: 'Em espera',
    cancelado: 'Cancelado',
  }
  return labels[status] ?? status
}

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const filters = await searchParams
  const q = filters.q ?? ''
  const status = filters.status ?? ''
  const turma = filters.turma ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'coach'].includes((profile?.role ?? '') as UserRole)) redirect('/dashboard')

  let query = supabase
    .from('candidatos')
    .select('*, turmas:turma_id ( nome )')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (turma) query = query.eq('turma_id', turma)

  const [{ data: candidatosRaw }, { data: turmasRaw }] = await Promise.all([
    query,
    supabase.from('turmas').select('id, nome').order('nome'),
  ])

  let candidatos = (candidatosRaw ?? []) as CandidatoWithTurma[]

  if (q) {
    const lower = q.toLowerCase()
    candidatos = candidatos.filter((c) =>
      [c.nome, c.responsavel_nome, c.responsavel_telefone, c.responsavel_email, c.turmas?.nome]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(lower))
    )
  }

  const turmaOptions = ((turmasRaw ?? []) as { id: string; nome: string }[]).map((t) => ({
    value: t.id,
    label: t.nome,
  }))

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar candidato...' },
    {
      type: 'select' as const,
      key: 'status',
      placeholder: 'Todos os status',
      options: [
        { value: 'inscrito', label: 'Inscrito' },
        { value: 'sorteado', label: 'Sorteado' },
        { value: 'em_espera', label: 'Em espera' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
    },
    ...(turmaOptions.length > 0
      ? [{ type: 'select' as const, key: 'turma', placeholder: 'Todas as turmas', options: turmaOptions }]
      : []),
  ]

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Candidatos"
        subtitle={`${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} encontrado${candidatos.length !== 1 ? 's' : ''}`}
      />

      <FilterBar fields={filterFields} initialValues={{ q, status, turma }} />

      {candidatos.length === 0 ? (
        <Card>
          <EmptyState
            icon={UserPlus}
            title="Nenhum candidato encontrado"
            description={q || status || turma ? 'Tente ajustar os filtros' : 'As inscrições aparecerão aqui'}
          />
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {candidatos.map((c) => (
              <Link
                key={c.id}
                href={`/candidatos/${c.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-navy-500 truncate">{c.nome}</p>
                      <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.turmas?.nome ?? 'Sem turma'}
                      {c.data_nascimento ? ` · ${calcularIdade(c.data_nascimento)} anos` : ''}
                      {c.responsavel_telefone ? ` · ${formatTelefone(c.responsavel_telefone)}` : ''}
                    </p>
                    {c.responsavel_nome && (
                      <p className="text-xs text-gray-500 mt-1">Responsável: {c.responsavel_nome}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(c.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
