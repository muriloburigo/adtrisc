import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { OBJETIVOS, type Objetivo } from '@/lib/treinos/tipos'
import { formatDate } from '@/lib/utils'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Planos de treino da turma ou do atleta (porte de training/plans do Movelly).
export default async function PlanosPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  if (!sp.turma && !sp.aluno) redirect('/treinos')

  // RLS: só aparece o que o usuário pode ver (titular/auxiliar da turma ou admin).
  const escopo = sp.aluno
    ? (await db.from('alunos').select('id, nome, turma_id').eq('id', sp.aluno).maybeSingle()).data
    : (await db.from('turmas').select('id, nome').eq('id', sp.turma).eq('usa_treinos', true).maybeSingle()).data
  if (!escopo) redirect('/treinos')
  const filtro = sp.aluno ? 'aluno_id' : 'turma_id'
  const qs = sp.aluno ? `aluno=${sp.aluno}` : `turma=${sp.turma}`

  const { data: planosRaw } = await db.from('treino_planos')
    .select('id, titulo, objetivo, status, inicio, fim, prova_alvo_nome, prova_alvo_data, treino_sessoes(count)')
    .eq(filtro, escopo.id).order('inicio', { ascending: false })
  const planos = (planosRaw ?? []) as { id: string; titulo: string; objetivo: Objetivo; status: string; inicio: string; fim: string; prova_alvo_nome: string | null; prova_alvo_data: string | null; treino_sessoes: { count: number }[] }[]

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <Link href={`/treinos?${qs}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500"><ArrowLeft size={14} /> Calendário</Link>
      <PageHeader title={`Planos — ${escopo.nome}`} subtitle="Períodos de treino com objetivo; gere automaticamente e ajuste no calendário"
        action={<Link href={`/treinos/planos/novo?${qs}`} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-3 py-2"><Plus size={14} /> Novo plano</Link>} />
      {planos.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="Nenhum plano ainda" description="Crie um plano para gerar os treinos de um período (ex.: 8 semanas até a prova)." /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((p) => (
            <Link key={p.id} href={`/treinos/planos/${p.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-sky-400 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-navy-500">{p.titulo}</p>
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${p.status === 'publicado' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{OBJETIVOS[p.objetivo]} · {formatDate(p.inicio)} a {formatDate(p.fim)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.treino_sessoes?.[0]?.count ?? 0} treinos{p.prova_alvo_nome ? ` · ${p.prova_alvo_nome}` : ''}{p.prova_alvo_data ? ` (${formatDate(p.prova_alvo_data)})` : ''}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
