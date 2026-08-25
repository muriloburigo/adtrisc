import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusAlunoVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import Avatar from '@/components/ui/Avatar'
import AlunoActionsMenu from './AlunoActionsMenu'
import { Plus, Users } from 'lucide-react'
import { calcularIdade, formatTelefone } from '@/lib/utils'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import type { AlunoRow } from '@/types/database'

type AlunoWithTurma = AlunoRow & {
  turmas: { nome: string } | null
}

export default async function AlunosPage({
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
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user?.id).single()

  let turmaIdsCoach: string[] | null = null
  if (profile?.role === 'coach') {
    turmaIdsCoach = await getTurmaIdsForCoach(supabase, user?.id)
  }

  let query = supabase
    .from('alunos')
    .select('*, turmas:turma_id ( nome )')
    .order('nome')

  if (status) query = query.eq('status', status)
  if (turma === 'sem-turma') query = query.is('turma_id', null)
  else if (turma) query = query.eq('turma_id', turma)
  if (turmaIdsCoach) query = query.in('turma_id', turmaIdsCoach.length > 0 ? turmaIdsCoach : ['__none__'])

  let turmasQuery = supabase.from('turmas').select('id, nome').order('nome')
  if (turmaIdsCoach) {
    turmasQuery = turmasQuery.in('id', turmaIdsCoach.length > 0 ? turmaIdsCoach : ['__none__'])
  }

  const [{ data: alunosRaw }, { data: turmasRaw }] = await Promise.all([
    query,
    turmasQuery,
  ])

  let alunos = (alunosRaw ?? []) as AlunoWithTurma[]

  if (q) {
    const lower = q.toLowerCase()
    alunos = alunos.filter((a) =>
      [a.nome, a.telefone, a.turmas?.nome]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(lower))
    )
  }

  const turmaOptions = ((turmasRaw ?? []) as { id: string; nome: string }[]).map((t) => ({
    value: t.id,
    label: t.nome,
  }))

  // "Sem turma" só existe pra admin: pela RLS, coach não enxerga atleta com
  // turma_id nulo (coach_has_turma(null) nunca é verdadeiro), então esse
  // filtro sempre voltaria vazio pra ele.
  if (!turmaIdsCoach) {
    turmaOptions.unshift({ value: 'sem-turma', label: 'Sem turma' })
  }

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar atleta...' },
    {
      type: 'select' as const,
      key: 'status',
      placeholder: 'Todos os status',
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'desligado', label: 'Desligado' },
      ],
    },
    ...(turmaOptions.length > 0
      ? [{ type: 'select' as const, key: 'turma', placeholder: 'Todas as turmas', options: turmaOptions }]
      : []),
  ]

  const hasFilters = Boolean(q || status || turma)

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Atletas"
        subtitle={`${alunos.length} atleta${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/alunos/novo">
            <Button><Plus size={16} />Novo Atleta</Button>
          </Link>
        }
      />

      <FilterBar fields={filterFields} initialValues={{ q, status, turma }} />

      {alunos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Nenhum atleta encontrado"
            description={hasFilters ? 'Tente ajustar os filtros' : 'Cadastre o primeiro atleta para começar'}
            action={!hasFilters ? <Link href="/alunos/novo"><Button><Plus size={16} />Novo Atleta</Button></Link> : undefined}
          />
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {alunos.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <Link href={`/alunos/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={a.nome} url={a.foto_url} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-navy-500 truncate">{a.nome}</p>
                      <Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.turmas?.nome ?? 'Sem turma'}
                      {a.data_nascimento ? ` · ${calcularIdade(a.data_nascimento)} anos` : ''}
                      {a.telefone ? ` · ${formatTelefone(a.telefone)}` : ''}
                    </p>
                  </div>
                </Link>
                <AlunoActionsMenu alunoId={a.id} alunoNome={a.nome} turmaId={a.turma_id} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
