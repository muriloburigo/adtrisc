import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusAlunoVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { Users, Plus } from 'lucide-react'
import { calcularIdade } from '@/lib/utils'

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const filters = await searchParams
  const q       = filters.q       ?? ''
  const turmaId = filters.turma   ?? ''
  const status  = filters.status  ?? ''

  const supabase = await createClient()

  // Turmas for filter dropdown
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('status', 'ativa')
    .order('nome')
  const turmaOptions = (turmasRaw ?? []).map((t: { id: string; nome: string }) => ({
    value: t.id,
    label: t.nome,
  }))

  let query = supabase
    .from('alunos')
    .select('id, nome, sexo, data_nascimento, status, turma_id, turmas:turma_id ( nome )')
    .order('nome')

  if (status) query = query.eq('status', status)
  if (turmaId) query = query.eq('turma_id', turmaId)

  const { data } = await query

  type AlunoRow = {
    id: string; nome: string; sexo: string | null
    data_nascimento: string | null; status: string
    turmas: { nome: string } | null
  }
  let alunos = (data ?? []) as unknown as AlunoRow[]

  if (q) {
    const lower = q.toLowerCase()
    alunos = alunos.filter((a) => a.nome.toLowerCase().includes(lower))
  }

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar por nome…' },
    { type: 'select' as const, key: 'turma', placeholder: 'Todas as turmas', options: turmaOptions },
    {
      type: 'select' as const,
      key: 'status',
      placeholder: 'Todos os status',
      options: [
        { value: 'ativo',    label: 'Ativo'    },
        { value: 'inativo',  label: 'Inativo'  },
        { value: 'suspenso', label: 'Suspenso' },
      ],
    },
  ]

  const initialValues = { q, turma: turmaId, status }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Atletas"
        subtitle={`${alunos.length} atleta${alunos.length !== 1 ? 's' : ''} encontrado${alunos.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/alunos/novo">
            <Button><Plus size={16} />Novo(a) Atleta</Button>
          </Link>
        }
      />

      <FilterBar fields={filterFields} initialValues={initialValues} />

      <Card padding={false}>
        {alunos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum(a) atleta encontrado(a)"
            description={q || turmaId || status ? 'Tente ajustar os filtros' : 'Adicione o(a) primeiro(a) atleta ao sistema'}
            action={
              !q && !turmaId && !status
                ? <Link href="/alunos/novo"><Button><Plus size={16} />Novo(a) Atleta</Button></Link>
                : undefined
            }
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {alunos.map((a) => (
                <Link key={a.id} href={`/alunos/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-sky-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-500 truncate">{a.nome}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {a.turmas?.nome ?? 'Sem turma'}{a.data_nascimento ? ` · ${calcularIdade(a.data_nascimento)} anos` : ''}
                    </p>
                  </div>
                  <Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge>
                </Link>
              ))}
            </div>
            {/* Desktop: table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Turma</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Sexo</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Idade</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunos.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <Link href={`/alunos/${a.id}`} className="font-medium text-navy-500 hover:text-sky-400 transition-colors">
                        {a.nome}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{a.turmas?.nome ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {a.sexo === 'M' ? 'Masc.' : a.sexo === 'F' ? 'Fem.' : a.sexo ?? '—'}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">
                      {a.data_nascimento ? `${calcularIdade(a.data_nascimento)} anos` : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  )
}
