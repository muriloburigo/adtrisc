import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import DiarioBatchForm from '../DiarioBatchForm'
import CoachSelector from './CoachSelector'

export const dynamic = 'force-dynamic'

export default async function NovaDiarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const sp = await searchParams

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const targetCoachId: string | null = isAdmin ? (sp.coach ?? null) : actor.id

  // ── Step 1 (admin): select coach ───────────────────────────────────────────
  if (isAdmin && !targetCoachId) {
    const { data: coaches } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'coach')
      .order('full_name')

    return (
      <div className="p-4 sm:p-8 max-w-2xl">
        <Header backHref="/diario" subtitle="Selecione o treinador" />
        <Card>
          <CoachSelector coaches={coaches ?? []} />
        </Card>
      </div>
    )
  }

  // ── Step 2: batch form with pending days ───────────────────────────────────
  let coachLabel = ''
  if (isAdmin && targetCoachId) {
    const { data: cp } = await supabase
      .from('profiles').select('full_name').eq('id', targetCoachId).single()
    coachLabel = cp?.full_name ?? ''
  }

  // Load all turmas for this coach
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('coach_id', targetCoachId)
    .order('nome')

  const allTurmas = (turmasRaw ?? []) as { id: string; nome: string }[]
  const turmaIds  = allTurmas.map((t) => t.id)

  // Find pending days: presencas in last 90 days without a diário entry
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toLocaleDateString('en-CA')
  const todayStr = new Date().toLocaleDateString('en-CA')

  type InitialDay = {
    date: string; modalidade: string; descricao: string; observacoes: string; turmaIds: string[]
  }
  let initialDays: InitialDay[] = []

  if (turmaIds.length > 0) {
    const [{ data: presencaRows }, { data: registroRows }] = await Promise.all([
      supabase
        .from('presencas')
        .select('data, turma_id')
        .in('turma_id', turmaIds)
        .gte('data', sinceStr)
        .lte('data', todayStr)
        .is('deleted_at', null),
      supabase
        .from('registros_aula')
        .select('data')
        .eq('coach_id', targetCoachId)
        .gte('data', sinceStr),
    ])

    const registroDates = new Set(
      (registroRows ?? []).map((r: { data: string }) => r.data)
    )

    const byDate = new Map<string, Set<string>>()
    for (const row of (presencaRows ?? []) as { data: string; turma_id: string }[]) {
      if (!byDate.has(row.data)) byDate.set(row.data, new Set())
      byDate.get(row.data)!.add(row.turma_id)
    }

    initialDays = [...byDate.entries()]
      .filter(([date]) => !registroDates.has(date))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ids]) => ({ date, modalidade: '', descricao: '', observacoes: '', turmaIds: [...ids] }))
  }

  const now = new Date()

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <Header
        backHref={isAdmin ? '/diario/nova' : '/diario'}
        subtitle={coachLabel || 'Registrar aulas'}
      />
      <Card>
        <DiarioBatchForm
          initialDays={initialDays}
          allTurmas={allTurmas}
          targetCoachId={targetCoachId ?? undefined}
          mes={now.getMonth() + 1}
          ano={now.getFullYear()}
        />
      </Card>
    </div>
  )
}

function Header({ backHref, subtitle }: { backHref: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href={backHref}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft size={20} />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-navy-500">Registrar Aulas</h1>
        <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}
