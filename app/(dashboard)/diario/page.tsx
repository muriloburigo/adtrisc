import { createClient } from '@/lib/supabase/server'
import { getTurmasDoCoach } from '@/lib/turmas'
import { processoDoTreinador } from '@/lib/processoSgpe'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import Card from '@/components/ui/Card'
import DiarioFilterForm from './DiarioFilterForm'
import DiarioClientView from './DiarioClientView'
import type { Aula, FotoBasic } from './DiarioClientView'
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
    descricao: string | null; observacoes: string | null; created_at: string
    turmaEntries: { turma_id: string }[]
  }

  let registros: RegistroRaw[] = []
  if (targetCoachId) {
    const { data } = await supabase
      .from('registros_aula')
      .select(`id, data, modalidade, objetivo, descricao, observacoes, created_at,
               turmaEntries:registro_aula_turmas ( turma_id )`)
      .eq('coach_id', targetCoachId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data')
      .order('created_at')
    registros = data ?? []
  }

  // ── Load fotos ────────────────────────────────────────────────────────────
  let fotos: (FotoBasic & { data: string })[] = []
  if (targetCoachId) {
    // Titular ou auxiliar: mesmas permissões.
    const turmaIds = (await getTurmasDoCoach(supabase, targetCoachId)).map((t) => t.id)
    if (turmaIds.length > 0) {
      const { data: fotosRaw } = await supabase
        .from('turma_fotos').select('id, url, titulo, data, turma_id, storage_path')
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

  // ── Aulas do mês + dias com chamada (sugerem registrar a aula) ──────────
  const aulas: Aula[] = registros.map((r) => ({
    id: r.id, data: r.data, modalidade: r.modalidade ?? '', objetivo: r.objetivo ?? '', descricao: r.descricao ?? '',
    observacoes: r.observacoes ?? '', turmaIds: (r.turmaEntries ?? []).map((t) => t.turma_id),
  }))
  let allTurmas: { id: string; nome: string }[] = []
  const chamadas: Record<string, string[]> = {}
  if (targetCoachId) {
    allTurmas = await getTurmasDoCoach(supabase, targetCoachId) // titular ou auxiliar
    const turmaIds = allTurmas.map((t) => t.id)
    if (turmaIds.length > 0) {
      const { data: presencaRows } = await supabase
        .from('presencas').select('data, turma_id')
        .in('turma_id', turmaIds)
        .gte('data', dataInicio).lte('data', dataFim)
        .is('deleted_at', null)
      for (const row of (presencaRows ?? []) as { data: string; turma_id: string }[]) {
        const l = (chamadas[row.data] ??= [])
        if (!l.includes(row.turma_id)) l.push(row.turma_id)
      }
    }
  }

  // ── Resumo do mês (persistido em diario_resumos) ─────────────────────────
  let cidade = ''
  let processo = ''
  let resumo = ''
  if (targetCoachId) {
    const { data: resumoRow } = await supabase
      .from('diario_resumos')
      .select('cidade, processo, resumo')
      .eq('coach_id', targetCoachId)
      .eq('ano', ano)
      .eq('mes', mes)
      .maybeSingle()
    cidade   = resumoRow?.cidade   ?? ''
    // Processo salvo no resumo do mês vence; vazio = o das Configurações.
    processo = resumoRow?.processo || (await processoDoTreinador(supabase, targetCoachId, ano))
    resumo   = resumoRow?.resumo   ?? ''
  }

  // ── Assinatura cadastrada do treinador (rodapé da impressão) ─────────────
  const { data: perfilAssinatura } = targetCoachId
    ? await supabase.from('profiles').select('assinatura').eq('id', targetCoachId).single()
    : { data: null }
  const assinaturaCoach: string | null = perfilAssinatura?.assinatura ?? null

  // ── Documentos assinados do diário ──────────────────────────────────────
  const periodo = `${ano}-${String(mes).padStart(2, '0')}`
  let documentos: DocumentoAssinadoItem[] = []
  if (targetCoachId) {
    const { data: docsRaw } = await supabase
      .from('documentos_assinados')
      .select('id, nome_arquivo, storage_path, enviado_em, assinaturas_digitais, enviado_por:profiles(full_name)')
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
          assinaturasDigitais: d.assinaturas_digitais ?? null,
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

      <div className="p-4 sm:p-8 max-w-6xl space-y-6">

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
            aulas={aulas}
            chamadas={chamadas}
            fotos={fotos}
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
            assinatura={assinaturaCoach}
            linkCadastroAssinatura={targetCoachId === actor.id ? '/conta' : isAdmin && targetCoachId ? `/coaches/${targetCoachId}/editar` : null}
          />
        )}

      </div>
    </>
  )
}
