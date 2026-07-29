import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Card from '@/components/ui/Card'
import ExportForm from './ExportForm'
import PrintButton from './PrintButton'
import { formatarDiasSemana, formatarHorario, formatTelefone } from '@/lib/utils'
import { getTurmaIdsForCoach } from '@/lib/turmas'
import DocumentosAssinadosSection, { type DocumentoAssinadoItem } from '@/components/documentos/DocumentosAssinadosSection'
import type { DiaSemana } from '@/types/database'

export const dynamic = 'force-dynamic'

type TurmaBasic = {
  id: string
  nome: string
  modalidade: string
  coach_nome: string | null
  coach_cref: string | null
  dias_semana: DiaSemana[]
  horario_inicio: string
  horario_fim: string
}
type AlunoBasic = {
  id: string
  nome: string
  telefone: string | null
  sexo: string | null
}
type PresencaEntry = {
  aluno_id: string
  data: string
  presente: boolean
  justificada: boolean
}
type Estado = 'P' | 'F' | 'J'

export default async function ExportarPresencasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  let turmasQuery = supabase
    .from('turmas')
    .select('id, nome, modalidade, coach_id, dias_semana, horario_inicio, horario_fim, profiles!turmas_coach_id_fkey(full_name, cref)')
    .eq('status', 'ativa')
    .order('nome')
  if (profile?.role === 'coach') {
    const turmaIdsCoach = await getTurmaIdsForCoach(supabase, user?.id)
    turmasQuery = turmasQuery.in('id', turmaIdsCoach.length > 0 ? turmaIdsCoach : ['__none__'])
  }
  const { data: turmasRaw } = await turmasQuery

  const turmas: TurmaBasic[] = (turmasRaw ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => ({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      dias_semana: t.dias_semana ?? [],
      horario_inicio: t.horario_inicio,
      horario_fim: t.horario_fim,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coach_nome: (t.profiles as any)?.full_name ?? null,
      coach_cref: (t.profiles as any)?.cref ?? null,
    }),
  )

  const params = await searchParams
  const turmaId    = params.turma    ?? ''
  const dataInicio = params.inicio   ?? ''
  const dataFim    = params.fim      ?? ''
  const local      = params.local    ?? 'Beira Mar São José'
  const processo   = params.processo ?? ''

  let turma: TurmaBasic | null = null
  let alunos: AlunoBasic[] = []
  let presencas: PresencaEntry[] = []
  let datas: string[] = []
  let respMap: Record<string, string> = {}

  if (turmaId && dataInicio && dataFim) {
    turma = turmas.find((t) => t.id === turmaId) ?? null

    if (turma) {
      const [{ data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
        supabase
          .from('alunos')
          .select('id, nome, telefone, sexo')
          .eq('turma_id', turmaId)
          .eq('status', 'ativo')
          .order('nome'),
        supabase
          .from('presencas')
          .select('aluno_id, data, presente, justificada')
          .eq('turma_id', turmaId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .is('deleted_at', null)
          .order('data'),
      ])

      alunos = (alunosRaw ?? []) as AlunoBasic[]
      presencas = (presencasRaw ?? []) as PresencaEntry[]

      // Fetch principal responsável for each aluno
      if (alunos.length > 0) {
        const { data: respLinks } = await supabase
          .from('aluno_responsavel')
          .select('aluno_id, principal, responsaveis(nome)')
          .in('aluno_id', alunos.map((a: AlunoBasic) => a.id))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const link of (respLinks ?? []) as any[]) {
          if (link.principal && link.responsaveis?.nome) {
            respMap[link.aluno_id] = link.responsaveis.nome
          }
        }
        // fallback: non-principal if no principal found
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const link of (respLinks ?? []) as any[]) {
          if (!respMap[link.aluno_id] && link.responsaveis?.nome) {
            respMap[link.aluno_id] = link.responsaveis.nome
          }
        }
      }

      const datasSet = new Set<string>()
      for (const p of presencas) datasSet.add(p.data)
      datas = [...datasSet].sort()
    }
  }

  // Build presenca map: aluno_id → date → Estado
  const presencaMap = new Map<string, Map<string, Estado>>()
  for (const aluno of alunos) presencaMap.set(aluno.id, new Map())
  for (const p of presencas) {
    presencaMap.get(p.aluno_id)?.set(p.data, p.presente ? 'P' : p.justificada ? 'J' : 'F')
  }

  const hasData = turma !== null && alunos.length > 0 && datas.length > 0

  const periodo = `${dataInicio}_${dataFim}`
  let documentos: DocumentoAssinadoItem[] = []
  if (hasData && turma) {
    const { data: docsRaw } = await supabase
      .from('documentos_assinados')
      .select('id, nome_arquivo, storage_path, enviado_em, enviado_por:profiles(full_name)')
      .eq('turma_id', turma.id)
      .eq('tipo', 'presenca_exportar')
      .eq('periodo', periodo)
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
          @page { size: A4 landscape; margin: 8mm 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-7xl space-y-6">
        {/* Tela: cabeçalho e formulário */}
        <div className="print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/presencas"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy-500">Exportar Lista de Chamada</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Escolha a turma e o período para gerar o PDF
              </p>
            </div>
          </div>

          <Card>
            <ExportForm
              turmas={turmas}
              initialTurma={turmaId}
              initialInicio={dataInicio}
              initialFim={dataFim}
              initialLocal={local}
              initialProcesso={processo}
            />
          </Card>

          {turmaId && dataInicio && dataFim && alunos.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhum aluno ativo encontrado nesta turma no período selecionado.
            </p>
          )}

          {turmaId && dataInicio && dataFim && alunos.length > 0 && datas.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Nenhuma presença registrada neste período.
            </p>
          )}
        </div>

        {hasData && turma && (
          <div>
            <div className="print:hidden flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} ·{' '}
                {datas.length} sessão{datas.length !== 1 ? 'ões' : ''}
              </p>
              <PrintButton />
            </div>

            <div className="print:hidden mb-4">
              <DocumentosAssinadosSection
                turmaId={turma.id}
                tipo="presenca_exportar"
                periodo={periodo}
                documentos={documentos}
              />
            </div>

            <AttendanceGrid
              turma={turma}
              alunos={alunos}
              datas={datas}
              presencaMap={presencaMap}
              respMap={respMap}
              local={local}
              processo={processo}
              coachCref={turma.coach_cref ?? ''}
            />
          </div>
        )}
      </div>
    </>
  )
}

function AttendanceGrid({
  turma,
  alunos,
  datas,
  presencaMap,
  respMap,
  local,
  processo,
  coachCref,
}: {
  turma: TurmaBasic
  alunos: AlunoBasic[]
  datas: string[]
  presencaMap: Map<string, Map<string, Estado>>
  respMap: Record<string, string>
  local: string
  processo: string
  coachCref: string
}) {
  const year = new Date().getFullYear()

  // Column widths
  const dateColW = datas.length <= 18 ? 26 : datas.length <= 26 ? 22 : 18

  // Info row style
  const infoRow = 'flex text-[10px] border-b border-gray-400 last:border-b-0'
  const infoLabel = 'font-bold uppercase'

  return (
    <div className="bg-white print:shadow-none" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── Logo header ── */}
      <div className="flex justify-between items-center mb-2 pb-2" style={{ borderBottom: '2px solid #222' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-incentivo-esporte.png" alt="Incentivo ao Esporte" style={{ height: 56, objectFit: 'contain' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-fesporte.png" alt="Fesporte" style={{ height: 56, objectFit: 'contain' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-governo-sc.png" alt="Governo do Estado de Santa Catarina" style={{ height: 56, objectFit: 'contain' }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-quarto.png" alt="" style={{ height: 56, objectFit: 'contain' }} />
      </div>

      {/* ── Title ── */}
      <p className="text-center font-bold uppercase mb-2" style={{ fontSize: 13 }}>
        Lista de Presença – {year}
      </p>

      {/* ── Info block ── */}
      <div className="mb-3" style={{ border: '1px solid #555', fontSize: 10 }}>
        <div className={infoRow}>
          <div className="flex-1 px-2 py-1">
            <span className={infoLabel}>Nome da OSC: </span>
            Associação Desportiva Triatlética de Santa Catarina/ADTRISC
            {processo && (
              <span style={{ marginLeft: 24 }}>
                <span className={infoLabel}>Processo SGPE FESPORTE: </span>{processo}
              </span>
            )}
          </div>
        </div>
        <div className={infoRow}>
          <div className="px-2 py-1">
            <span className={infoLabel}>Local do Atendimento: </span>
            {local}
          </div>
        </div>
        <div className={infoRow}>
          <div className="px-2 py-1">
            <span className={infoLabel}>Turma: </span>{turma.nome}
            <span className="mx-3">|</span>
            <span className={infoLabel}>Dias da Semana: </span>{formatarDiasSemana(turma.dias_semana)}
            <span className="mx-3">|</span>
            <span className={infoLabel}>Horário: </span>
            {formatarHorario(turma.horario_inicio)} às {formatarHorario(turma.horario_fim)}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table
          className="border-collapse w-full"
          style={{
            fontSize: 9,
            tableLayout: 'fixed',
            width: `${28 + 160 + 90 + 130 + 18 + 18 + datas.length * dateColW}px`,
            minWidth: '100%',
          }}
        >
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 18 }} />
            <col style={{ width: 18 }} />
            {datas.map((d) => <col key={d} style={{ width: dateColW }} />)}
          </colgroup>

          <thead>
            <tr style={{ backgroundColor: '#0C143D', color: '#fff' }}>
              <th className="text-center py-1.5 px-1 font-bold" style={{ fontSize: 8 }}>Nº</th>
              <th className="text-left px-2 py-1.5 font-bold" style={{ fontSize: 8 }}>NOME DO ALUNO</th>
              <th className="text-left px-2 py-1.5 font-bold" style={{ fontSize: 8 }}>TELEFONE</th>
              <th className="text-left px-2 py-1.5 font-bold" style={{ fontSize: 8 }}>RESPONSÁVEL</th>
              <th className="text-center py-1.5 font-bold" style={{ fontSize: 8 }}>M</th>
              <th className="text-center py-1.5 font-bold" style={{ fontSize: 8 }}>F</th>
              {datas.map((d) => (
                <th key={d} className="text-center py-1 font-bold leading-tight" style={{ fontSize: 8 }}>
                  {d.slice(8, 10)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {alunos.map((aluno, idx) => {
              const alunoMap = presencaMap.get(aluno.id) ?? new Map<string, Estado>()
              const rowBg = idx % 2 === 0 ? '#FFFDE7' : '#DBEAFE'
              return (
                <tr key={aluno.id} style={{ backgroundColor: rowBg }}>
                  <td className="text-center py-1 px-1" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {idx + 1}
                  </td>
                  <td className="px-2 py-1 font-medium truncate" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {aluno.nome}
                  </td>
                  <td className="px-2 py-1" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {formatTelefone(aluno.telefone)}
                  </td>
                  <td className="px-2 py-1 truncate" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {respMap[aluno.id] ?? ''}
                  </td>
                  <td className="text-center py-1 font-bold" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {aluno.sexo === 'M' ? 'X' : ''}
                  </td>
                  <td className="text-center py-1 font-bold" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                    {aluno.sexo === 'F' ? 'X' : ''}
                  </td>
                  {datas.map((data) => {
                    const estado = alunoMap.get(data)
                    return (
                      <td key={data} className="text-center py-1 font-bold" style={{ border: '1px solid #ccc', fontSize: 9 }}>
                        {estado === 'P' ? 'X' : estado === 'J' ? 'J' : ''}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Legenda (só tela) ── */}
      <div className="print:hidden flex gap-4 mt-4 text-xs text-gray-500">
        <span><strong>X</strong> = Presente</span>
        <span><strong>J</strong> = Justificada</span>
        <span className="text-gray-300">(vazio = falta / não registrado)</span>
      </div>

      {/* ── Assinatura (só impressão) ── */}
      <div className="hidden print:flex mt-8 gap-16 text-xs text-gray-500">
        <div className="flex-1">
          <div style={{ borderBottom: '1px solid #555', paddingBottom: 24, marginBottom: 4 }} />
          <p>
            Assinatura do Treinador
            {(turma.coach_nome || coachCref) && (
              <span style={{ marginLeft: 16 }}>
                {turma.coach_nome}{turma.coach_nome && coachCref ? ' – ' : ''}{coachCref && `CREF ${coachCref}`}
              </span>
            )}
          </p>
        </div>
        <div style={{ width: 160 }}>
          <div style={{ borderBottom: '1px solid #555', paddingBottom: 24, marginBottom: 4 }} />
          <p>Data</p>
        </div>
      </div>
    </div>
  )
}
