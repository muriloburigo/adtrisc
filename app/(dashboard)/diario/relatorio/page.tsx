import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import RelatorioForm from './RelatorioForm'
import PrintButton from './PrintButton'
import type { TurmaFotoRow } from '@/types/database'

export const dynamic = 'force-dynamic'

const MESES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_EXTENSO = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MODALIDADE_LABEL: Record<string, string> = {
  corrida: 'Corrida', ciclismo: 'Ciclismo', natacao: 'Natação',
  triathlon: 'Triathlon', duathlon: 'Duathlon', reuniao: 'Reunião',
}
const DIA_SEMANA: Record<string, string> = {
  0: 'domingo', 1: 'segunda-feira', 2: 'terça-feira', 3: 'quarta-feira',
  4: 'quinta-feira', 5: 'sexta-feira', 6: 'sábado',
}

function ultimoDia(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate()
}
function formatDataExtenso(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} – ${DIA_SEMANA[d.getDay()]}`
}

type Registro = {
  id: string; data: string; modalidade: string; objetivo: string | null; observacoes: string | null
  coach: { full_name: string | null } | null
  turmaEntries: Array<{ turma_id: string; descricao: string | null; turma: { nome: string } | null }>
  fotos: TurmaFotoRow[]
}

export default async function DiarioRelatorioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const sp = await searchParams

  const now  = new Date()
  const mes      = Number(sp.mes)      || now.getMonth() + 1
  const ano      = Number(sp.ano)      || now.getFullYear()
  const cref     = sp.cref     ?? ''
  const cidade   = sp.cidade   ?? 'São José'
  const processo = sp.processo ?? ''
  const resumo   = sp.resumo   ?? ''

  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFim    = new Date(ano, mes, 0).toLocaleDateString('en-CA')

  const { data: myProfile } = await supabase
    .from('profiles').select('role, full_name').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  // Determine which coach's data to show
  const targetCoachId: string | null = isAdmin ? (sp.coach ?? null) : actor.id

  // Fetch registros filtered by coach
  let query = supabase
    .from('registros_aula')
    .select(`
      id, data, modalidade, objetivo, observacoes,
      coach:coach_id ( full_name ),
      turmaEntries:registro_aula_turmas ( turma_id, descricao, turma:turma_id ( nome ) )
    `)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true })

  if (targetCoachId) {
    query = query.eq('coach_id', targetCoachId)
  } else if (!isAdmin) {
    query = query.eq('coach_id', actor.id)
  }

  const { data: registrosRaw } = await query
  const registros = (registrosRaw ?? []) as Omit<Registro, 'fotos'>[]

  // Resolve coach name: from registros, or fetch directly if needed
  let coachName = registros[0]?.coach?.full_name ?? ''
  if (!coachName && targetCoachId) {
    const { data: cp } = await supabase.from('profiles').select('full_name').eq('id', targetCoachId).single()
    coachName = cp?.full_name ?? ''
  }
  if (!coachName) coachName = myProfile?.full_name ?? ''

  // Fetch fotos for the coach's turmas in this date range
  let fotos: TurmaFotoRow[] = []
  if (targetCoachId) {
    const { data: turmasRaw } = await supabase
      .from('turmas').select('id').eq('coach_id', targetCoachId)
    const turmaIds = (turmasRaw ?? []).map((t: { id: string }) => t.id)
    if (turmaIds.length > 0) {
      const { data: fotosRaw } = await supabase
        .from('turma_fotos')
        .select('*')
        .in('turma_id', turmaIds)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true })
      fotos = (fotosRaw ?? []) as TurmaFotoRow[]
    }
  } else {
    const { data: fotosRaw } = await supabase
      .from('turma_fotos')
      .select('*')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true })
    fotos = (fotosRaw ?? []) as TurmaFotoRow[]
  }

  // Attach fotos to each registro by date
  const registrosComFotos: Registro[] = registros.map((r) => ({
    ...r,
    fotos: fotos.filter((f) => f.data === r.data),
  }))

  const hasData = registros.length > 0

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm 14mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .page-break { page-break-before: always; break-before: page; }
          .no-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-4xl space-y-6">

        {/* Controls — screen only */}
        <div className="print:hidden">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
              <Link
                href={`/diario?mes=${mes}&ano=${ano}${targetCoachId && isAdmin ? `&coach=${targetCoachId}` : ''}`}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-navy-500">Relatório Diário de Atividades</h1>
                <p className="text-sm text-gray-400 mt-0.5">{MESES_LABEL[mes]} {ano}</p>
              </div>
            </div>
            {hasData && <PrintButton />}
          </div>
          <Card>
            <RelatorioForm
              mes={mes} ano={ano}
              cref={cref} cidade={cidade} processo={processo} resumo={resumo}
              coachId={targetCoachId ?? undefined}
            />
          </Card>
          {!hasData && (
            <p className="text-sm text-gray-400 text-center py-10">
              Nenhum registro para {MESES_LABEL[mes].toLowerCase()} de {ano}.
            </p>
          )}
        </div>

        {/* Printable document */}
        {hasData && (
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}>

            {/* Logos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0C143D', paddingBottom: 6, marginBottom: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-escolinha.png" alt="ADTRISC" style={{ height: 60, objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos-estado.png" alt="Logos Estado" style={{ height: 44, objectFit: 'contain' }} />
            </div>

            {/* Title */}
            <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: 4 }}>
              Relatório Diário de Atividades
            </p>
            <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', marginBottom: 16 }}>
              Escolinha de Triathlon ADTRISC – São José {ano}
            </p>

            {/* Header info */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 4 }}>
                <strong>Professor(a):</strong> {coachName}
                {cref && <span style={{ marginLeft: 32 }}><strong>CREF</strong> {cref}</span>}
              </p>
              <p><strong>Mês/Ano:</strong> {MESES_LABEL[mes]}/{ano}</p>
              {processo && <p style={{ marginTop: 4, fontSize: 10, color: '#555' }}>Processo SGPE FESPORTE {processo}</p>}
            </div>

            {/* Orientações */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 6 }}>ORIENTAÇÕES</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: 20, lineHeight: 1.7, fontSize: 10, color: '#333' }}>
                <li>Preencher um registro para cada dia de atividade.</li>
                <li>A lista de chamada/frequência deverá ser enviada em anexo.</li>
                <li>Descrever de forma objetiva os conteúdos desenvolvidos.</li>
                <li>Informar adaptações realizadas conforme faixa etária e nível das turmas.</li>
                <li>Inserir registros fotográficos das turmas quando houver.</li>
                <li>Em caso de chuva e impossibilidade de uso do espaço coberto, registrar o cancelamento da atividade.</li>
              </ul>
            </div>

            {/* Resumo do mês */}
            {resumo && (
              <p style={{ textAlign: 'justify', marginBottom: 20, lineHeight: 1.8 }}>{resumo}</p>
            )}

            {/* Aulas */}
            {registrosComFotos.map((r, idx) => (
              <div key={r.id} className="no-break" style={{ marginBottom: 24 }}>

                {/* Separador */}
                {idx > 0 && <hr style={{ borderColor: '#ccc', marginBottom: 16 }} />}

                <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>AULA Nº {idx + 1}</p>
                <p style={{ marginBottom: 2 }}><strong>Data:</strong> {formatDataExtenso(r.data)}</p>
                <p style={{ marginBottom: 2 }}><strong>Modalidade:</strong> {MODALIDADE_LABEL[r.modalidade] ?? r.modalidade}</p>

                {/* Turmas atendidas */}
                <p style={{ marginBottom: 8 }}>
                  <strong>Turmas atendidas: </strong>
                  {r.turmaEntries.map((t, i) => (
                    <span key={t.turma_id} style={{ marginRight: 12 }}>
                      {t.turma?.nome ?? t.turma_id} ✔
                    </span>
                  ))}
                </p>

                {/* Descrição do treino */}
                {r.objetivo && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Descrição do Treino</p>
                    <p style={{ marginBottom: 10, textAlign: 'justify', lineHeight: 1.7 }}>{r.objetivo}</p>
                  </>
                )}

                {/* Observações */}
                {r.observacoes && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Observações / Intercorrências</p>
                    <p style={{ marginBottom: 10, lineHeight: 1.7 }}>{r.observacoes}</p>
                  </>
                )}

                {/* Fotos da aula */}
                {r.fotos.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {r.fotos.map((foto) => (
                      <div key={foto.id} className="no-break" style={{ marginBottom: 12, textAlign: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={foto.url}
                          alt={foto.titulo}
                          style={{ maxWidth: '80%', maxHeight: 260, objectFit: 'cover', borderRadius: 6, display: 'block', margin: '0 auto' }}
                        />
                        <p style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                          <strong>{foto.titulo}</strong>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Footer */}
            <div style={{ marginTop: 32, borderTop: '1px solid #ccc', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #555', width: 260, paddingBottom: 22, marginBottom: 5 }} />
                  <p style={{ margin: 0, fontWeight: 700 }}>Treinador Responsável</p>
                  {coachName && (
                    <p style={{ margin: '3px 0 0' }}>
                      {coachName}{cref ? ` – CREF ${cref}` : ''}
                    </p>
                  )}
                </div>
                <p style={{ margin: 0 }}>
                  {cidade}, {ultimoDia(ano, mes)} de {MESES_EXTENSO[mes]} de {ano}.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Bottom print button — screen only */}
        {hasData && (
          <div className="print:hidden flex justify-center pt-2 pb-4">
            <PrintButton />
          </div>
        )}
      </div>
    </>
  )
}
