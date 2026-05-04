import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft, ShieldCheck, CheckCircle2, XCircle, ClipboardList } from 'lucide-react'
import type { SorteioRow, UserRole } from '@/types/database'

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

export default async function SorteioAuditoriaPage({
  params,
}: {
  params: Promise<{ sorteioId: string }>
}) {
  const { sorteioId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: pr } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'coach'].includes((pr?.role ?? '') as UserRole)) redirect('/dashboard')

  const { data: raw } = await supabase
    .from('sorteios')
    .select('*, turmas:turma_id(nome, capacidade), realizador:realizado_por(full_name)')
    .eq('id', sorteioId)
    .single()

  if (!raw) notFound()

  type SorteioComRelacoes = SorteioRow & {
    turmas: { nome: string; capacidade: number } | null
    realizador: { full_name: string | null } | null
  }
  const s = raw as SorteioComRelacoes

  const sorteados    = s.resultado.filter(r => r.sorteado)
  const naoSorteados = s.resultado.filter(r => !r.sorteado)

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/candidatos" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 transition-colors mb-4">
        <ChevronLeft size={13} /> Candidatos
      </Link>

      <PageHeader
        title={`Sorteio — ${s.turmas?.nome ?? 'Turma'}`}
        subtitle={`Realizado em ${formatDateTime(s.realizado_em)}`}
      />

      {/* Audit box */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <ShieldCheck size={15} className="text-violet-500" />
          <h2 className="text-sm font-semibold text-navy-500">Registro de Auditoria</h2>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400">Turma</dt>
            <dd className="font-medium text-navy-500 mt-0.5">{s.turmas?.nome ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Realizado por</dt>
            <dd className="font-medium text-navy-500 mt-0.5">{s.realizador?.full_name ?? 'Desconhecido'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Data e hora</dt>
            <dd className="font-medium text-navy-500 mt-0.5">{formatDateTime(s.realizado_em)}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Vagas disponíveis</dt>
            <dd className="font-medium text-navy-500 mt-0.5">{s.vagas}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Candidatos participantes</dt>
            <dd className="font-medium text-navy-500 mt-0.5">{s.total_candidatos}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400">Sorteados / Não sorteados</dt>
            <dd className="font-medium text-navy-500 mt-0.5">
              <span className="text-emerald-600">{sorteados.length} sorteados</span>
              {naoSorteados.length > 0 && (
                <span className="text-gray-400"> · {naoSorteados.length} não sorteados</span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-400 mb-1">Semente (seed)</dt>
            <dd className="font-mono text-[11px] sm:text-xs bg-gray-50 rounded-lg px-3 py-2 break-all leading-relaxed text-navy-500 select-all">
              {s.seed}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-400 mb-1">ID do sorteio</dt>
            <dd className="font-mono text-[11px] sm:text-xs bg-gray-50 rounded-lg px-3 py-2 break-all leading-relaxed text-gray-500 select-all">
              {s.id}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Resultado do sorteio */}
      <Card padding={false} className="mb-6">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <CheckCircle2 size={15} className="text-emerald-500" />
          <h2 className="text-sm font-semibold text-navy-500">Resultado do Sorteio</h2>
          <span className="ml-auto text-xs text-gray-400">{s.resultado.length} posições</span>
        </div>
        <div className="divide-y divide-gray-100">
          {s.resultado.map((r) => (
            <div key={r.candidato_id} className={`flex items-center gap-3 px-6 py-3 ${r.sorteado ? '' : 'opacity-60'}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                r.sorteado ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {r.posicao}
              </span>
              <span className="flex-1 text-sm font-medium text-navy-500">
                <Link href={`/candidatos/${r.candidato_id}`} className="hover:text-sky-500 transition-colors">
                  {r.nome}
                </Link>
              </span>
              {r.sorteado ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> Sorteado(a)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <XCircle size={13} /> Não sorteado(a)
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Como verificar */}
      <Card>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <ClipboardList size={15} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-navy-500">Como verificar este sorteio</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            O sorteio usa o algoritmo <strong>Fisher-Yates</strong> com o gerador pseudo-aleatório
            {' '}<strong>Mulberry32</strong>. A semente é derivada da seed acima via hash DJB2.
            Qualquer pessoa pode reproduzir o resultado:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-600 pl-2">
            <li>Pegue a lista de candidatos na ordem de inscrição (abaixo).</li>
            <li>Use a seed: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{s.seed}</code></li>
            <li>Aplique Fisher-Yates com Mulberry32 inicializado pelo hash DJB2 da seed.</li>
            <li>Os primeiros <strong>{s.vagas}</strong> da lista embaralhada são os sorteados.</li>
          </ol>

          <details className="group">
            <summary className="cursor-pointer text-xs text-sky-500 font-medium select-none list-none flex items-center gap-1 mt-2">
              <span className="group-open:hidden">▶</span>
              <span className="hidden group-open:inline">▼</span>
              Ver lista original de candidatos (ordem de inscrição)
            </summary>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 sm:p-4 font-mono text-[11px] sm:text-xs text-gray-600 space-y-1 max-h-64 overflow-y-auto overflow-x-auto">
              {s.candidatos_snapshot.map((c) => (
                <div key={c.candidato_id} className="flex gap-2 sm:gap-3 min-w-0">
                  <span className="w-5 text-gray-400 text-right flex-shrink-0">{c.posicao_inscricao}.</span>
                  <span className="text-gray-400 truncate hidden sm:block">{c.candidato_id}</span>
                  <span className="text-navy-500 flex-shrink-0">{c.nome}</span>
                </div>
              ))}
            </div>
          </details>

          <details className="group">
            <summary className="cursor-pointer text-xs text-sky-500 font-medium select-none list-none flex items-center gap-1">
              <span className="group-open:hidden">▶</span>
              <span className="hidden group-open:inline">▼</span>
              Ver código do algoritmo
            </summary>
            <pre className="mt-3 bg-gray-50 rounded-xl p-3 sm:p-4 text-[11px] sm:text-xs text-gray-600 overflow-x-auto whitespace-pre">{`function hashSeed(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  return h >>> 0
}

function seededShuffle(arr, seed) {
  let s = hashSeed(seed)
  const rng = () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Uso:
// const shuffled = seededShuffle(candidatos, "${s.seed}")
// const sorteados = shuffled.slice(0, ${s.vagas})`}</pre>
          </details>
        </div>
      </Card>
    </div>
  )
}
