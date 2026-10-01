import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { Plus, Users } from 'lucide-react'
import { calcularIdade } from '@/lib/utils'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import { createAdminClient } from '@/lib/supabase/admin'
import { pendenciasDoUsuario } from '@/lib/transferencias'
import { ListaAtletas, OutrasTurmas, type AtletaLinha, type AtletaOutraTurma } from './ListaAtletas'
import PendenciasTransferencias from './PendenciasTransferencias'
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
  const ehAdmin = profile?.role === 'admin'
  // Aba "Outras turmas" (só treinador): nome, turma e idade de quem é de outros treinadores.
  const aba = !ehAdmin && filters.aba === 'outras' ? 'outras' : 'minhas'

  // Transferências: as turmas de destino (todas as ativas; "direto" = o usuário
  // também é treinador dela), as pendências e quem já tem pedido em aberto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const minhasSet = new Set(turmaIdsCoach ?? [])
  const [{ data: todasTurmas }, pendencias, { data: pendRaw }] = await Promise.all([
    admin.from('turmas').select('id, nome').eq('status', 'ativa').order('nome'),
    pendenciasDoUsuario(admin, user?.id, ehAdmin),
    admin.from('transferencias').select('aluno_id').eq('status', 'pendente').gt('expira_em', new Date().toISOString()),
  ])
  const destinos = ((todasTurmas ?? []) as { id: string; nome: string }[])
    .map((t) => ({ ...t, direto: ehAdmin || minhasSet.has(t.id) }))
  const comPendente = new Set(((pendRaw ?? []) as { aluno_id: string }[]).map((r) => r.aluno_id))

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

  let outras: AtletaOutraTurma[] = []
  if (aba === 'outras') {
    const { data: outrasRaw } = await admin
      .from('alunos')
      .select('id, nome, data_nascimento, turma_id, turmas:turma_id ( nome )')
      .eq('status', 'ativo')
      .not('turma_id', 'is', null)
      .order('nome')
    const lower = q.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outras = ((outrasRaw ?? []) as any[])
      .filter((a) => !minhasSet.has(a.turma_id))
      .filter((a) => !q || [a.nome, a.turmas?.nome].filter(Boolean).some((v: string) => v.toLowerCase().includes(lower)))
      // Só o necessário para reconhecer a pessoa: nada de contato, saúde ou avaliações.
      .map((a) => ({
        id: a.id, nome: a.nome, turma_nome: a.turmas?.nome ?? '',
        idade: a.data_nascimento ? calcularIdade(a.data_nascimento) : null,
        pendente: comPendente.has(a.id),
      }))
  }

  const linhas: AtletaLinha[] = alunos.map((a) => ({
    id: a.id, nome: a.nome, status: a.status, foto_url: a.foto_url, telefone: a.telefone,
    data_nascimento: a.data_nascimento, turma_id: a.turma_id, turma_nome: a.turmas?.nome ?? null,
    pendente: comPendente.has(a.id),
  }))

  const filterFields = aba === 'outras' ? [{ type: 'search' as const, key: 'q', placeholder: 'Buscar atleta ou turma...' }] : [
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
  const abaCls = (ativa: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium ${ativa ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Atletas"
        subtitle={aba === 'outras'
          ? `${outras.length} atleta${outras.length !== 1 ? 's' : ''} de outras turmas`
          : `${alunos.length} atleta${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/alunos/novo">
            <Button><Plus size={16} />Novo Atleta</Button>
          </Link>
        }
      />

      <PendenciasTransferencias paraResponder={pendencias.paraResponder} enviadas={pendencias.enviadas} />

      {!ehAdmin && (
        <div className="flex gap-1 mb-4">
          <Link href="/alunos" className={abaCls(aba === 'minhas')}>Minhas turmas</Link>
          <Link href="/alunos?aba=outras" className={abaCls(aba === 'outras')}>Outras turmas</Link>
        </div>
      )}

      <FilterBar key={aba} fields={filterFields} initialValues={aba === 'outras' ? { q } : { q, status, turma }} fixedParams={aba === 'outras' ? { aba: 'outras' } : undefined} />

      {aba === 'outras' ? (
        outras.length === 0 ? (
          <Card><EmptyState icon={Users} title="Nenhum atleta encontrado" description={q ? 'Tente outra busca' : 'Não há atletas em outras turmas'} /></Card>
        ) : (
          <OutrasTurmas atletas={outras} minhasTurmas={destinos.filter((t) => t.direto)} />
        )
      ) : alunos.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Nenhum atleta encontrado"
            description={hasFilters ? 'Tente ajustar os filtros' : 'Cadastre o primeiro atleta para começar'}
            action={!hasFilters ? <Link href="/alunos/novo"><Button><Plus size={16} />Novo Atleta</Button></Link> : undefined}
          />
        </Card>
      ) : (
        <ListaAtletas atletas={linhas} turmas={destinos} />
      )}
    </div>
  )
}
