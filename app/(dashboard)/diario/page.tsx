import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import Card from '@/components/ui/Card'
import DiarioFilterForm from './DiarioFilterForm'
import DiarioClientView from './DiarioClientView'
import type { InitialDay } from './DiarioClientView'
import type { DocumentoAssinadoItem } from '@/components/documentos/DocumentosAssinadosSection'

export const dynamic = 'force-dynamic'

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const sp = await searchParams

  const now = new Date()
  const mes      = Number(sp.mes)  || now.getMonth() + 1
  const ano      = Number(sp.ano)  || now.getFullYear()
  const cref     = sp.cref     ?? ''
  const cidade   = sp.cidade   ?? ''
  const processo = sp.processo ?? ''
  const resumo   = sp.resumo   ?? ''

  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFim    = new Date(ano, mes, 0).toLocaleDateString('en-CA')

  const { data: myProfile } = await supabase
    .from('profiles').select('role, full_name, cref').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  let coaches: { id: string; full_name: string | null }[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('profiles').select('id, full_name').eq('role', 'coach').order('full_name')
    coaches = data ?? []
  }

  const selectedCoach: string | null = isAdmin ? (sp.coach ?? null) : actor.id
  const targetCoachId = selectedCoach

  // ── Load registros ───────────────────────────────────────────────────────
  type RegistroRaw = {
    id: string; data: string; modalidade: string | null; objetivo: string | null
    descricao: string | null; observacoes: string | null
    turmaEntries: { turma_id: string }[]
  }

  let registros: RegistroRaw[] = []
  if (targetCoachId) {
    const { data } = await supabase
      .from('registros_aula')
      .select(`id, data, modalidade, objetivo, descricao, observacoes,
               turmaEntries:registro_aula_turmas ( turma_id )`)
      .eq('coach_id', targetCoachId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data')
    registros = data ?? []
  }

  // ── Load fotos ────────────────────────────────────────────────────────────
  type FotoBasic = { id: string; url: string; titulo: string; data: string }
  let fotos: FotoBasic[] = []
  if (targetCoachId) {
    const { data: turmasRaw } = await supabase
      .from('turmas').select('id').eq('coach_id', targetCoachId)
    const turmaIds = (turmasRaw ?? []).map((t: { id: string }) => t.id)
    if (turmaIds.length > 0) {
      const { data: fotosRaw } = await supabase
        .from('turma_fotos').select('id, url, titulo, data')
        .in('turma_id', turmaIds)
        .gte('data', dataInicio).lte('data', dataFim)
        .order('data')
      fotos = fotosRaw ?? []
    }
  }

  // ── Coach display name + CREF ─────────────────────────────────────────────
  let coachName = ''
  let profileCref = ''
  if (!isAdmin) {
    coachName  = myProfile?.full_name ?? ''
    profileCref = myProfile?.cref ?? ''
  } else if (targetCoachId) {
    const { data: cp } = await supabase.from('profiles').select('full_name, cref').eq('id', targetCoachId).single()
    coachName   = cp?.full_name ?? ''
    profileCref = cp?.cref ?? ''
  }

  // ── Build initialDays ─────────────────────────────────────────────────────
  const registroMap = new Map<string, { modalidade: string; objetivo: string; descricao: string; observacoes: string; turmaIds: string[] }>()
  for (const r of registros) {
    registroMap.set(r.data, {
      modalidade:  r.modalidade  ?? '',
      objetivo:    r.objetivo    ?? '',
      descricao:   r.descricao   ?? '',
      observacoes: r.observacoes ?? '',
      turmaIds: (r.turmaEntries ?? []).map((t) => t.turma_id),
    })
  }

  let initialDays: InitialDay[] = []
  let allTurmas: { id: string; nome: string }[] = []

  if (targetCoachId) {
    const { data: turmasRaw } = await supabase
      .from('turmas').select('id, nome').eq('coach_id', targetCoachId).order('nome')
    allTurmas = turmasRaw ?? []
    const turmaIds = allTurmas.map((t: { id: string }) => t.id)

    if (turmaIds.length > 0) {
      const { data: presencaRows } = await supabase
        .from('presencas').select('data, turma_id')
        .in('turma_id', turmaIds)
        .gte('data', dataInicio).lte('data', dataFim)
        .is('deleted_at', null)

      const byDate = new Map<string, Set<string>>()
      for (const row of (presencaRows ?? []) as { data: string; turma_id: string }[]) {
        if (!byDate.has(row.data)) byDate.set(row.data, new Set())
        byDate.get(row.data)!.add(row.turma_id)
      }

      const allDates = new Set([...registroMap.keys(), ...byDate.keys()])
      initialDays = [...allDates].sort().map((date) => {
        const existing = registroMap.get(date)
        const dayFotos = fotos.filter((f) => f.data === date).map(({ id, url, titulo }) => ({ id, url, titulo }))
        if (existing) {
          return { date, ...existing, fotos: dayFotos }
        }
        return { date, modalidade: '', objetivo: '', descricao: '', observacoes: '', turmaIds: [...(byDate.get(date) ?? [])], fotos: dayFotos }
      })
    } else {
      initialDays = [...registroMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, r]) => ({
        date, ...r,
        fotos: fotos.filter((f) => f.data === date).map(({ id, url, titulo }) => ({ id, url, titulo })),
      }))
    }
  }

  // ── Documentos assinados do diário ──────────────────────────────────────
  const periodo = `${ano}-${String(mes).padStart(2, '0')}`
  let documentos: DocumentoAssinadoItem[] = []
  if (targetCoachId) {
    const { data: docsRaw } = await supabase
      .from('documentos_assinados')
      .select('id, nome_arquivo, storage_path, enviado_em, enviado_por:profiles(full_name)')
      .eq('coach_id', targetCoachId)
      .eq('tipo', 'diario_aula')
      .order('enviado_em', { ascending: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminForSigned = createAdminClient() as any
    documentos = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((docsRaw ?? []) as any[]).map(async (d) => {
        const { data: signed } = await adminForSigned.storage
          .from('documentos')
          .createSignedUrl(d.storage_path, 3600)
        return {
          id: d.id,
          nomeArquivo: d.nome_arquivo,
          storagePath: d.storage_path,
          enviadoEm: d.enviado_em,
          enviadoPorNome: d.enviado_por?.full_name ?? null,
          signedUrl: signed?.signedUrl ?? null,
        }
      }),
    )
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 14mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-break { break-inside: avoid; page-break-inside: avoid; }
          body, div, main, section, article {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-4xl space-y-8">

        {/* ── Filters (hidden when printing) ── */}
        <div className="print:hidden space-y-2">
          <h1 className="text-2xl font-bold text-navy-500">Diário de Aulas</h1>
          <Card>
            <DiarioFilterForm
              mes={mes} ano={ano}
              isAdmin={isAdmin} coaches={coaches} selectedCoach={selectedCoach}
            />
          </Card>
        </div>

        {/* ── Admin: no coach selected ── */}
        {isAdmin && !targetCoachId && (
          <p className="print:hidden text-sm text-gray-400 text-center py-8">
            Selecione um treinador para ver o diário.
          </p>
        )}

        {/* ── Unified report + form ── */}
        {targetCoachId && (
          <DiarioClientView
            key={`${ano}-${mes}-${targetCoachId}`}
            initialDays={initialDays}
            allTurmas={allTurmas}
            targetCoachId={targetCoachId}
            mes={mes}
            ano={ano}
            coachName={coachName}
            initialCref={cref || profileCref}
            initialCidade={cidade}
            initialProcesso={processo}
            initialResumo={resumo}
            periodo={periodo}
            documentos={documentos}
          />
        )}

      </div>
    </>
  )
}
