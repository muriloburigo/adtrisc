import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Card from '@/components/ui/Card'
import ExportForm from './ExportForm'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

type TurmaBasic = {
  id: string
  nome: string
  modalidade: string
  coach_nome: string | null
}
type AlunoBasic = { id: string; nome: string }
type PresencaEntry = {
  aluno_id: string
  data: string
  presente: boolean
  justificada: boolean
}
type Estado = 'P' | 'F' | 'J'

const MODALIDADE_LABEL: Record<string, string> = {
  natacao: 'Natação',
  ciclismo: 'Ciclismo',
  corrida: 'Corrida',
  triathlon: 'Triathlon',
}

function formatDateShort(d: string) {
  // d = YYYY-MM-DD → DD/MM/AAAA
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
}

function formatDateCol(d: string) {
  // d = YYYY-MM-DD → "DD\nMM" (two lines)
  return { day: d.slice(8, 10), month: d.slice(5, 7) }
}

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
    .select('id, nome, modalidade, coach_id, profiles!turmas_coach_id_fkey(full_name)')
    .eq('status', 'ativa')
    .order('nome')
  if (profile?.role === 'coach') turmasQuery = turmasQuery.eq('coach_id', user?.id)
  const { data: turmasRaw } = await turmasQuery

  const turmas: TurmaBasic[] = (turmasRaw ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => ({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coach_nome: (t.profiles as any)?.full_name ?? null,
    }),
  )

  const params = await searchParams
  const turmaId = params.turma ?? ''
  const dataInicio = params.inicio ?? ''
  const dataFim = params.fim ?? ''

  let turma: TurmaBasic | null = null
  let alunos: AlunoBasic[] = []
  let presencas: PresencaEntry[] = []
  let datas: string[] = []

  if (turmaId && dataInicio && dataFim) {
    turma = turmas.find((t) => t.id === turmaId) ?? null

    if (turma) {
      const [{ data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
        supabase
          .from('alunos')
          .select('id, nome')
          .eq('turma_id', turmaId)
          .eq('status', 'ativo')
          .order('nome'),
        supabase
          .from('presencas')
          .select('aluno_id, data, presente, justificada')
          .eq('turma_id', turmaId)
          .gte('data', dataInicio)
          .lte('data', dataFim)
          .order('data'),
      ])

      alunos = (alunosRaw ?? []) as AlunoBasic[]
      presencas = (presencasRaw ?? []) as PresencaEntry[]

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
  const geradoEm = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <>
      {/* Inject print page settings scoped to this page */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
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

        {/* Grid de chamada — aparece na tela quando há dados, sempre aparece no print */}
        {hasData && turma && (
          <div>
            {/* Botão imprimir — somente na tela */}
            <div className="print:hidden flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} ·{' '}
                {datas.length} sessão{datas.length !== 1 ? 'ões' : ''}
              </p>
              <PrintButton />
            </div>

            {/* O grid de chamada */}
            <AttendanceGrid
              turma={turma}
              alunos={alunos}
              datas={datas}
              presencaMap={presencaMap}
              periodo={{ inicio: dataInicio, fim: dataFim }}
              geradoEm={geradoEm}
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
  periodo,
  geradoEm,
}: {
  turma: TurmaBasic
  alunos: AlunoBasic[]
  datas: string[]
  presencaMap: Map<string, Map<string, Estado>>
  periodo: { inicio: string; fim: string }
  geradoEm: string
}) {
  const alunoStats = alunos.map((aluno) => {
    const m = presencaMap.get(aluno.id) ?? new Map<string, Estado>()
    let presentes = 0
    for (const [, e] of m) if (e === 'P') presentes++
    const total = m.size
    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0
    return { aluno, presentes, total, pct }
  })

  const dataStats = datas.map((data) => {
    let presentes = 0
    let total = 0
    for (const aluno of alunos) {
      const e = presencaMap.get(aluno.id)?.get(data)
      if (e !== undefined) {
        total++
        if (e === 'P') presentes++
      }
    }
    return { data, presentes, total }
  })

  const overallPresentes = alunoStats.reduce((s, a) => s + a.presentes, 0)
  const overallPossivel = alunoStats.reduce((s, a) => s + a.total, 0)
  const overallPct = overallPossivel > 0 ? Math.round((overallPresentes / overallPossivel) * 100) : 0

  // Largura das colunas de data: 28px para até 20 sessões, 22px para mais
  const dateColW = datas.length <= 20 ? 28 : 22

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 print:rounded-none print:border-none print:p-0 print:shadow-none">
      {/* Cabeçalho do documento */}
      <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-0.5">ADTRISC</p>
          <h2 className="text-xl font-extrabold text-navy-500">Lista de Chamada</h2>
          <p className="text-sm font-semibold text-navy-500 mt-2">
            {turma.nome}
            <span className="font-normal text-gray-400">
              {' '}·{' '}{MODALIDADE_LABEL[turma.modalidade] ?? turma.modalidade}
            </span>
          </p>
          {turma.coach_nome && (
            <p className="text-xs text-gray-400 mt-0.5">Coach: {turma.coach_nome}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="font-semibold text-gray-600">
            {formatDateShort(periodo.inicio)} — {formatDateShort(periodo.fim)}
          </p>
          <p className="mt-0.5">
            {datas.length} sessão{datas.length !== 1 ? 'ões' : ''}
          </p>
          <p className="mt-3">Gerado em {geradoEm}</p>
        </div>
      </div>

      {/* Legenda */}
      <div className="print:hidden flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">P</span>
          Presente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">F</span>
          Falta
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">J</span>
          Justificada
        </span>
      </div>

      {/* Tabela de chamada */}
      <div className="overflow-x-auto">
        <table
          className="border-collapse text-xs"
          style={{ tableLayout: 'fixed', width: `${180 + datas.length * dateColW + 50 + 44}px`, minWidth: '100%' }}
        >
          <colgroup>
            <col style={{ width: '180px', minWidth: '120px' }} />
            {datas.map((d) => (
              <col key={d} style={{ width: `${dateColW}px` }} />
            ))}
            <col style={{ width: '50px' }} />
            <col style={{ width: '44px' }} />
          </colgroup>

          <thead>
            <tr style={{ backgroundColor: '#0C143D' }}>
              <th className="text-left px-3 py-2 font-semibold text-white text-xs">Aluno</th>
              {datas.map((d) => {
                const { day, month } = formatDateCol(d)
                return (
                  <th key={d} className="text-center py-1.5 px-0 font-semibold text-white leading-tight">
                    <span className="block text-[10px]">{day}</span>
                    <span className="block text-[10px] opacity-70">{month}</span>
                  </th>
                )
              })}
              <th className="text-center px-1 py-2 font-semibold text-white text-[10px] leading-tight">
                <span className="block">Pres.</span>
              </th>
              <th className="text-center px-1 py-2 font-semibold text-white text-[10px] leading-tight">
                <span className="block">Freq.</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {alunoStats.map(({ aluno, presentes, total, pct }, idx) => {
              const alunoMap = presencaMap.get(aluno.id) ?? new Map<string, Estado>()
              const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              return (
                <tr key={aluno.id} className={rowBg}>
                  <td className="px-3 py-1.5 font-medium text-navy-500 text-xs border-b border-gray-100 truncate">
                    {aluno.nome}
                  </td>
                  {datas.map((data) => {
                    const estado = alunoMap.get(data)
                    const cellClass = 'text-center border-b border-gray-100'
                    if (estado === 'P')
                      return (
                        <td key={data} className={cellClass}>
                          <span className="block py-1.5 bg-emerald-100 text-emerald-700 font-bold text-[10px]">P</span>
                        </td>
                      )
                    if (estado === 'F')
                      return (
                        <td key={data} className={cellClass}>
                          <span className="block py-1.5 bg-red-100 text-red-600 font-bold text-[10px]">F</span>
                        </td>
                      )
                    if (estado === 'J')
                      return (
                        <td key={data} className={cellClass}>
                          <span className="block py-1.5 bg-amber-100 text-amber-600 font-bold text-[10px]">J</span>
                        </td>
                      )
                    return (
                      <td key={data} className={cellClass}>
                        <span className="block py-1.5 text-gray-200 text-[10px]">—</span>
                      </td>
                    )
                  })}
                  <td className="text-center py-1.5 px-1 text-xs font-semibold text-gray-600 border-b border-gray-100">
                    {presentes}/{total}
                  </td>
                  <td
                    className={`text-center py-1.5 px-1 text-xs font-bold border-b border-gray-100 ${
                      pct >= 75
                        ? 'text-emerald-600'
                        : pct >= 50
                          ? 'text-amber-500'
                          : 'text-red-500'
                    }`}
                  >
                    {pct}%
                  </td>
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr style={{ backgroundColor: '#eeeef4' }}>
              <td className="px-3 py-2 text-xs font-bold text-navy-500">
                Média geral —{' '}
                <span
                  className={
                    overallPct >= 75
                      ? 'text-emerald-600'
                      : overallPct >= 50
                        ? 'text-amber-500'
                        : 'text-red-500'
                  }
                >
                  {overallPct}%
                </span>
              </td>
              {dataStats.map(({ data, presentes, total }) => (
                <td key={data} className="text-center py-2 text-[10px] font-semibold text-navy-500 leading-tight">
                  {total > 0 ? (
                    <>
                      <span className="block">{presentes}</span>
                      <span className="block opacity-50">/{total}</span>
                    </>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              <td
                className={`text-center py-2 px-1 text-xs font-bold ${
                  overallPct >= 75
                    ? 'text-emerald-600'
                    : overallPct >= 50
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`}
                colSpan={2}
              >
                {overallPresentes}/{overallPossivel}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Rodapé para assinatura — somente no print */}
      <div className="hidden print:block mt-10 pt-5 border-t border-gray-300">
        <div className="flex gap-16 text-xs text-gray-400">
          <div className="flex-1">
            <div className="border-b border-gray-400 mb-1.5 pb-7" />
            <p>Assinatura do Treinador</p>
          </div>
          <div style={{ width: '180px' }}>
            <div className="border-b border-gray-400 mb-1.5 pb-7" />
            <p>Data</p>
          </div>
        </div>
      </div>
    </div>
  )
}
