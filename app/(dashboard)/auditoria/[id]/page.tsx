import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft, User, Clock, Tag, FileText } from 'lucide-react'

// ── Field label translations ──────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  nome: 'Nome', full_name: 'Nome completo', email: 'E-mail', role: 'Perfil',
  status: 'Status', modalidade: 'Modalidade', dias_semana: 'Dias da semana',
  horario_inicio: 'Horário início', horario_fim: 'Horário fim',
  coach_id: 'Treinador(a)', capacidade: 'Capacidade', ano: 'Ano',
  semestre: 'Semestre', idade_min: 'Idade mín.', idade_max: 'Idade máx.',
  observacoes: 'Observações', turma_id: 'Turma',
  telefone: 'Telefone', sexo: 'Sexo', data_nascimento: 'Data de nascimento',
  rua: 'Rua', numero: 'Número', bairro: 'Bairro', cep: 'CEP', cidade: 'Cidade',
  profile_id: 'Perfil vinculado',
}

const ACTION_LABEL: Record<string, string> = {
  criar: 'Criação', editar: 'Edição', excluir: 'Exclusão',
  senha: 'Redefinição de senha', status: 'Alteração de status', sorteio: 'Sorteio',
}

const RESOURCE_LABEL: Record<string, string> = {
  turma: 'Turma', atleta: 'Atleta', treinador: 'Treinador(a)',
  candidato: 'Candidato(a)', usuario: 'Usuário',
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

type FieldEntry = {
  key: string
  label: string
  before: unknown
  after: unknown
  changed: boolean
}

function computeDiff(
  before: Record<string, unknown> | null,
  after:  Record<string, unknown> | null,
): FieldEntry[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after  ?? {}),
  ])

  const entries: FieldEntry[] = []
  for (const key of keys) {
    const bv = before?.[key] ?? undefined
    const av = after?.[key]  ?? undefined
    entries.push({
      key,
      label: FIELD_LABELS[key] ?? key,
      before: bv,
      after:  av,
      changed: JSON.stringify(bv) !== JSON.stringify(av),
    })
  }

  // Sort: changed fields first
  return entries.sort((a, b) => (b.changed ? 1 : 0) - (a.changed ? 1 : 0))
}

function displayValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AuditoriaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: pr } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (pr?.role !== 'admin') redirect('/dashboard')

  const { data: log } = await supabase
    .from('audit_logs').select('*').eq('id', id).single()

  if (!log) notFound()

  const diff = computeDiff(log.before_data, log.after_data)
  const hasDiff = log.before_data || log.after_data
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0

  const isCreate = log.action === 'criar'
  const isDelete = log.action === 'excluir'

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link
        href="/auditoria"
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 transition-colors mb-4"
      >
        <ChevronLeft size={13} /> Auditoria
      </Link>

      <PageHeader
        title={`${ACTION_LABEL[log.action] ?? log.action} — ${RESOURCE_LABEL[log.resource] ?? log.resource}`}
        subtitle={log.resource_label ?? log.resource_id}
      />

      {/* Summary card */}
      <Card className="mb-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div className="flex items-start gap-2">
            <User size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-gray-400">Usuário</dt>
              <dd className="font-medium text-navy-500 mt-0.5">{log.user_name}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-gray-400">Data e hora</dt>
              <dd className="font-medium text-navy-500 mt-0.5 font-mono text-xs">
                {formatDateTime(log.created_at)}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tag size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-gray-400">Recurso</dt>
              <dd className="font-medium text-navy-500 mt-0.5">
                {RESOURCE_LABEL[log.resource] ?? log.resource}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText size={14} className="text-sky-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-gray-400">ID do registro</dt>
              <dd className="font-mono text-[11px] text-gray-400 mt-0.5 break-all">{log.resource_id}</dd>
            </div>
          </div>
        </dl>
      </Card>

      {/* Diff table */}
      {hasDiff && (
        <Card padding={false} className="mb-4">
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-navy-500">
              {isCreate ? 'Dados criados' : isDelete ? 'Dados excluídos' : 'Campos alterados'}
            </h2>
            {!isCreate && !isDelete && (
              <p className="text-xs text-gray-400 mt-0.5">
                {diff.filter(f => f.changed).length} campo{diff.filter(f => f.changed).length !== 1 ? 's' : ''} alterado{diff.filter(f => f.changed).length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Header row */}
          {!isCreate && !isDelete && (
            <div className="grid grid-cols-3 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
              <span>Campo</span>
              <span>Antes</span>
              <span>Depois</span>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {diff.map(({ key, label, before: bv, after: av, changed }) => {
              if (isCreate && av === undefined) return null
              if (isDelete && bv === undefined) return null
              if (!isCreate && !isDelete && !changed) return null

              return (
                <div
                  key={key}
                  className={`grid px-6 py-3 text-sm gap-x-4 ${
                    isCreate || isDelete ? 'grid-cols-2' : 'grid-cols-3'
                  } ${changed && !isCreate && !isDelete ? 'bg-amber-50/40' : ''}`}
                >
                  <span className="font-medium text-gray-700 truncate">{label}</span>

                  {isCreate ? (
                    <span className="text-emerald-700 break-words">{displayValue(av)}</span>
                  ) : isDelete ? (
                    <span className="text-red-600 break-words">{displayValue(bv)}</span>
                  ) : (
                    <>
                      <span className={`break-words ${changed ? 'line-through text-red-400' : 'text-gray-500'}`}>
                        {displayValue(bv)}
                      </span>
                      <span className={`break-words ${changed ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                        {displayValue(av)}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Metadata */}
      {hasMetadata && (
        <Card padding={false}>
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-navy-500">Metadados</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {Object.entries(log.metadata as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 px-6 py-3 text-sm gap-x-4">
                <span className="font-medium text-gray-500">{FIELD_LABELS[k] ?? k}</span>
                <span className="text-navy-500 break-words">{displayValue(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
