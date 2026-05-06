import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import { Users, ExternalLink, History, BookOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { StatusBadge } from './StatusSelect'
import SorteioButton from './SorteioButton'
import type { CandidatoRow, SorteioRow, UserRole } from '@/types/database'

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profileRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profileRaw?.role ?? 'aluno') as UserRole
  if (!['admin', 'coach'].includes(role)) redirect('/dashboard')

  const filters = await searchParams
  const q       = filters.q      ?? ''
  const status  = filters.status ?? ''
  const turmaId = filters.turma  ?? ''

  // Turmas for filter
  const { data: turmasRaw } = await supabase
    .from('turmas').select('id, nome').order('nome')
  const turmaOptions = (turmasRaw ?? []).map((t: { id: string; nome: string }) => ({ value: t.id, label: t.nome }))

  // Sorteio data — only when a turma filter is active
  let turmaSelecionada: { id: string; nome: string; capacidade: number } | null = null
  let pendentesCount = 0
  let listaEsperaCount = 0
  let sorteiosAnteriores: (SorteioRow & { realizador: { full_name: string | null } | null })[] = []

  if (turmaId) {
    const { data: td } = await supabase.from('turmas').select('id, nome, capacidade').eq('id', turmaId).single()
    turmaSelecionada = td ?? null

    const [{ count: pCount }, { count: leCount }, { data: sa }] = await Promise.all([
      supabase
        .from('candidatos').select('id', { count: 'exact', head: true })
        .eq('turma_id', turmaId).eq('status', 'pendente'),
      supabase
        .from('candidatos').select('id', { count: 'exact', head: true })
        .eq('turma_id', turmaId).eq('status', 'nao_sorteado'),
      supabase
        .from('sorteios')
        .select('id, realizado_em, vagas, total_candidatos, realizador:realizado_por(full_name)')
        .eq('turma_id', turmaId)
        .order('realizado_em', { ascending: false }),
    ])
    pendentesCount   = pCount  ?? 0
    listaEsperaCount = leCount ?? 0
    sorteiosAnteriores = sa ?? []
  }

  let query = supabase
    .from('candidatos')
    .select('*, turmas:turma_id ( nome )')
    .order('created_at', { ascending: false })

  if (status)  query = query.eq('status', status)
  if (turmaId) query = query.eq('turma_id', turmaId)

  const { data: rawList } = await query
  type CandidatoComTurma = CandidatoRow & { turmas: { nome: string } | null }
  let candidatos = (rawList ?? []) as CandidatoComTurma[]

  if (q) {
    const lower = q.toLowerCase()
    candidatos = candidatos.filter((c) =>
      c.nome.toLowerCase().includes(lower) ||
      (c.responsavel_nome ?? '').toLowerCase().includes(lower) ||
      (c.email_responsavel ?? '').toLowerCase().includes(lower)
    )
  }

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar por nome…' },
    { type: 'select' as const, key: 'turma', placeholder: 'Todas as turmas', options: turmaOptions },
    {
      type: 'select' as const,
      key: 'status',
      placeholder: 'Todos os status',
      options: [
        { value: 'pendente',     label: 'Pendente'         },
        { value: 'sorteado',     label: 'Sorteado(a)'      },
        { value: 'nao_sorteado', label: 'Lista de Espera'   },
        { value: 'convertido',   label: 'Convertido(a)'    },
      ],
    },
  ]

  const counts = {
    pendente:     candidatos.filter((c) => c.status === 'pendente').length,
    sorteado:     candidatos.filter((c) => c.status === 'sorteado').length,
    nao_sorteado: candidatos.filter((c) => c.status === 'nao_sorteado').length,
    convertido:   candidatos.filter((c) => c.status === 'convertido').length,
  }

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Candidatos"
        subtitle={`${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} encontrado${candidatos.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <a
              href="/regras-sorteio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <BookOpen size={13} /> Regras
            </a>
            <a
              href="/inscricao"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-sky-500 border border-sky-200 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <ExternalLink size={13} /> Link público
            </a>
          </div>
        }
      />

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'Pendentes',       value: counts.pendente,     color: 'bg-amber-100 text-amber-700' },
          { label: 'Sorteados',       value: counts.sorteado,     color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Lista de Espera',  value: counts.nao_sorteado, color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Convertidos',     value: counts.convertido,   color: 'bg-blue-100 text-blue-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${color}`}>
            <span className="font-bold">{value}</span> {label}
          </div>
        ))}
      </div>

      <FilterBar fields={filterFields} initialValues={{ q, status, turma: turmaId }} />

      {/* Sorteio panel — visible only when a turma is selected */}
      {turmaSelecionada && role === 'admin' && (
        <div className="mb-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-700">{turmaSelecionada.nome}</p>
            <p className="text-xs text-violet-500 mt-0.5">
              {pendentesCount} novo{pendentesCount !== 1 ? 's' : ''} · {listaEsperaCount} em espera · {turmaSelecionada.capacidade} vagas
            </p>
          </div>
          <SorteioButton
            turmaId={turmaSelecionada.id}
            turmaNome={turmaSelecionada.nome}
            totalPendentes={pendentesCount}
            listaEsperaCount={listaEsperaCount}
            vagas={turmaSelecionada.capacidade}
            totalSorteiosAnteriores={sorteiosAnteriores.length}
          />
        </div>
      )}

      {/* Previous draws */}
      {sorteiosAnteriores.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <History size={11} /> Sorteios anteriores
          </h3>
          <div className="flex flex-col gap-1.5">
            {sorteiosAnteriores.map((s) => (
              <Link
                key={s.id}
                href={`/candidatos/sorteio/${s.id}`}
                className="flex items-center gap-3 bg-white border border-gray-100 hover:border-violet-200 hover:bg-violet-50 rounded-xl px-4 py-2.5 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-navy-500 group-hover:text-violet-700 truncate">
                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s.realizado_em))}
                    {' '}· por {(s.realizador as { full_name: string | null } | null)?.full_name ?? 'Desconhecido'}
                  </p>
                  <p className="text-xs text-gray-400">{s.total_candidatos} candidatos · {s.vagas} vagas</p>
                </div>
                <span className="text-xs text-violet-400 font-medium group-hover:text-violet-600">Ver auditoria →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Card padding={false}>
        {candidatos.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum candidato encontrado" description={q || status || turmaId ? 'Tente ajustar os filtros' : 'As inscrições aparecem aqui após os pais preencherem o formulário público.'} />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Turma</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Responsável</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Inscrito em</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidatos.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <Link href={`/candidatos/${c.id}`} className="font-medium text-navy-500 hover:text-sky-400 transition-colors">
                        {c.nome}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{c.turmas?.nome ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-500">{c.responsavel_nome ?? '—'}</td>
                    <td className="px-6 py-3.5 text-gray-500">{formatDate(c.created_at.slice(0, 10))}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {candidatos.map((c) => (
                <Link key={c.id} href={`/candidatos/${c.id}`} className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-sky-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {c.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy-500 truncate">{c.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{c.turmas?.nome ?? '—'} · {formatDate(c.created_at.slice(0, 10))}</p>
                    <div className="mt-1"><StatusBadge status={c.status} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
