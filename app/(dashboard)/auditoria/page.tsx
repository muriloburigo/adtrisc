import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import FilterBar from '@/components/ui/FilterBar'
import EmptyState from '@/components/ui/EmptyState'
import { ScrollText } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  criar:    { label: 'Criar',         color: 'bg-emerald-100 text-emerald-700' },
  editar:   { label: 'Editar',        color: 'bg-sky-100 text-sky-700'         },
  excluir:  { label: 'Excluir',       color: 'bg-red-100 text-red-700'         },
  senha:    { label: 'Redefinir senha', color: 'bg-amber-100 text-amber-700'   },
  status:   { label: 'Status',        color: 'bg-purple-100 text-purple-700'   },
  sorteio:  { label: 'Sorteio',       color: 'bg-violet-100 text-violet-700'   },
}

const RESOURCE_LABEL: Record<string, string> = {
  turma:     'Turma',
  atleta:    'Atleta',
  treinador: 'Treinador(a)',
  candidato: 'Candidato(a)',
  usuario:   'Usuário',
  presenca:  'Presença',
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))
}

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_LABEL[action] ?? { label: action, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function ResourceBadge({ resource }: { resource: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      {RESOURCE_LABEL[resource] ?? resource}
    </span>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: pr } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (pr?.role !== 'admin') redirect('/dashboard')

  const filters  = await searchParams
  const q        = filters.q        ?? ''
  const resource = filters.resource ?? ''
  const action   = filters.action   ?? ''

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (resource) query = query.eq('resource', resource)
  if (action)   query = query.eq('action', action)

  const { data: raw } = await query

  type AuditLog = {
    id: string; user_id: string | null; user_name: string
    action: string; resource: string; resource_id: string
    resource_label: string | null; before_data: Record<string, unknown> | null
    after_data: Record<string, unknown> | null; metadata: Record<string, unknown> | null
    created_at: string
  }

  let logs = (raw ?? []) as AuditLog[]

  if (q) {
    const lower = q.toLowerCase()
    logs = logs.filter(l =>
      l.user_name.toLowerCase().includes(lower) ||
      (l.resource_label ?? '').toLowerCase().includes(lower)
    )
  }

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar por usuário ou registro…' },
    {
      type: 'select' as const, key: 'resource', placeholder: 'Todos os recursos',
      options: Object.entries(RESOURCE_LABEL).map(([v, l]) => ({ value: v, label: l })),
    },
    {
      type: 'select' as const, key: 'action', placeholder: 'Todas as ações',
      options: Object.entries(ACTION_LABEL).map(([v, c]) => ({ value: v, label: c.label })),
    },
  ]

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Auditoria"
        subtitle={`${logs.length} registro${logs.length !== 1 ? 's' : ''} encontrado${logs.length !== 1 ? 's' : ''}`}
      />

      <FilterBar fields={filterFields} initialValues={{ q, resource, action }} />

      <Card padding={false}>
        {logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhum registro encontrado"
            description={q || resource || action ? 'Tente ajustar os filtros.' : 'As ações do sistema aparecerão aqui.'}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium whitespace-nowrap">Data/Hora</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Usuário</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Ação</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Recurso</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Registro</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-gray-400 text-xs whitespace-nowrap font-mono">
                      {formatDateTime(l.created_at)}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-navy-500">{l.user_name}</td>
                    <td className="px-6 py-3.5"><ActionBadge action={l.action} /></td>
                    <td className="px-6 py-3.5"><ResourceBadge resource={l.resource} /></td>
                    <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">{l.resource_label ?? '—'}</td>
                    <td className="px-6 py-3.5 text-right">
                      <Link
                        href={`/auditoria/${l.id}`}
                        className="text-xs text-sky-500 hover:text-sky-600 font-medium"
                      >
                        Detalhes →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {logs.map((l) => (
                <Link
                  key={l.id}
                  href={`/auditoria/${l.id}`}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBadge action={l.action} />
                      <ResourceBadge resource={l.resource} />
                    </div>
                    <p className="text-sm font-medium text-navy-500 truncate">
                      {l.resource_label ?? l.resource_id}
                    </p>
                    <p className="text-xs text-gray-400">
                      {l.user_name} · {formatDateTime(l.created_at)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0 mt-1">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
