import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import {
  formatarDiasSemana,
  formatarHorario,
  calcularIdade,
  formatDate,
} from '@/lib/utils'
import type { TurmaRow, TurmaFotoRow, DiaSemana } from '@/types/database'
import RelatorioForm from './RelatorioForm'

export const dynamic = 'force-dynamic'

const MESES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MODALIDADE_LABEL: Record<string, string> = {
  natacao: 'Natação', ciclismo: 'Ciclismo', corrida: 'Corrida', triathlon: 'Triathlon',
}

const SEX_LABEL: Record<string, string> = { M: 'M', F: 'F' }

type TurmaWithCoach = TurmaRow & { coaches: { full_name: string | null } | null }
type AlunoBasic = { id: string; nome: string; data_nascimento: string | null; sexo: string | null }
type PresencaEntry = { aluno_id: string; data: string; presente: boolean; justificada: boolean }
type Estado = 'P' | 'F' | 'J'

function ultimoDiaMes(ano: number, mes: number): string {
  return new Date(ano, mes, 0).toLocaleDateString('en-CA')
}

function formatDateCol(d: string) {
  return { day: d.slice(8, 10), weekday: diaSemanaAbrev(new Date(d + 'T12:00:00')) }
}

function diaSemanaAbrev(date: Date): string {
  return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()]
}

export default async function RelatorioTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await params
  const sp = await searchParams

  const now = new Date()
  const mes = Number(sp.mes) || now.getMonth() + 1
  const ano = Number(sp.ano) || now.getFullYear()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any

  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFim    = ultimoDiaMes(ano, mes)

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: presencasRaw }, { data: fotosRaw }] = await Promise.all([
    supabase
      .from('turmas')
      .select('*, coaches:coach_id ( full_name )')
      .eq('id', id)
      .single(),
    supabase
      .from('alunos')
      .select('id, nome, data_nascimento, sexo')
      .eq('turma_id', id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('presencas')
      .select('aluno_id, data, presente, justificada')
      .eq('turma_id', id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data'),
    adminDb
      .from('turma_fotos')
      .select('*')
      .eq('turma_id', id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true }),
  ])

  if (!turmaRaw) notFound()

  const turma   = turmaRaw as TurmaWithCoach & { dias_semana: DiaSemana[] }
  const alunos  = (alunosRaw  ?? []) as AlunoBasic[]
  const presencas = (presencasRaw ?? []) as PresencaEntry[]
  const fotos   = (fotosRaw ?? []) as TurmaFotoRow[]

  // Unique session dates sorted ascending
  const datasSet = new Set<string>()
  for (const p of presencas) datasSet.add(p.data)
  const datas = [...datasSet].sort()

  // Build presenca map: aluno_id → date → Estado
  const presencaMap = new Map<string, Map<string, Estado>>()
  for (const a of alunos) presencaMap.set(a.id, new Map())
  for (const p of presencas) {
    presencaMap.get(p.aluno_id)?.set(p.data, p.presente ? 'P' : p.justificada ? 'J' : 'F')
  }

  // Per-aluno stats
  const alunoStats = alunos.map((aluno) => {
    const m = presencaMap.get(aluno.id) ?? new Map<string, Estado>()
    let presentes = 0, justificadas = 0, faltas = 0
    for (const [, e] of m) {
      if (e === 'P') presentes++
      else if (e === 'J') justificadas++
      else faltas++
    }
    const total = m.size
    const pct = total > 0 ? Math.round((presentes / total) * 100) : null
    return { aluno, presentes, faltas, justificadas, total, pct }
  })

  // Per-date stats
  const dataStats = datas.map((data) => {
    let presentes = 0, total = 0
    for (const a of alunos) {
      const e = presencaMap.get(a.id)?.get(data)
      if (e !== undefined) { total++; if (e === 'P') presentes++ }
    }
    return { data, presentes, total }
  })

  const overallPresentes = alunoStats.reduce((s, a) => s + a.presentes, 0)
  const overallTotal     = alunoStats.reduce((s, a) => s + a.total, 0)
  const overallPct       = overallTotal > 0 ? Math.round((overallPresentes / overallTotal) * 100) : null

  const alunos75  = alunoStats.filter((a) => a.pct != null && a.pct >= 75).length
  const alunosBaixo = alunoStats.filter((a) => a.pct != null && a.pct < 75).length

  const geradoEm = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const dateColW = datas.length <= 18 ? 30 : 24
  const hasSessions = datas.length > 0

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-7xl space-y-6">

        {/* Controles — somente tela */}
        <div className="print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href={`/turmas/${id}`}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-navy-500">Relatório Mensal</h1>
              <p className="text-sm text-gray-400 mt-0.5">{turma.nome}</p>
            </div>
          </div>

          <Card>
            <RelatorioForm mes={mes} ano={ano} hasData={hasSessions} />
          </Card>

          {!hasSessions && (
            <p className="text-sm text-gray-400 text-center py-10">
              Nenhuma presença registrada para {MESES_LABEL[mes].toLowerCase()} de {ano}.
            </p>
          )}
        </div>

        {/* Relatório — tela quando há dados, sempre no print */}
        {(hasSessions || true) && (
          <div className={hasSessions ? '' : 'hidden print:block'}>
            <Relatorio
              turma={turma}
              alunos={alunos}
              datas={datas}
              presencaMap={presencaMap}
              alunoStats={alunoStats}
              dataStats={dataStats}
              overallPresentes={overallPresentes}
              overallTotal={overallTotal}
              overallPct={overallPct}
              alunos75={alunos75}
              alunosBaixo={alunosBaixo}
              mes={mes}
              ano={ano}
              geradoEm={geradoEm}
              dateColW={dateColW}
              fotos={fotos}
            />
          </div>
        )}
      </div>
    </>
  )
}

type AlunoStat = {
  aluno: AlunoBasic
  presentes: number
  faltas: number
  justificadas: number
  total: number
  pct: number | null
}
type DateStat = { data: string; presentes: number; total: number }

function Relatorio({
  turma, alunos, datas, presencaMap,
  alunoStats, dataStats,
  overallPresentes, overallTotal, overallPct,
  alunos75, alunosBaixo,
  mes, ano, geradoEm, dateColW, fotos,
}: {
  turma: TurmaWithCoach & { dias_semana: DiaSemana[] }
  alunos: AlunoBasic[]
  datas: string[]
  presencaMap: Map<string, Map<string, Estado>>
  alunoStats: AlunoStat[]
  dataStats: DateStat[]
  overallPresentes: number
  overallTotal: number
  overallPct: number | null
  alunos75: number
  alunosBaixo: number
  mes: number
  ano: number
  geradoEm: string
  dateColW: number
  fotos: TurmaFotoRow[]
}) {
  const hasSessions = datas.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6 print:rounded-none print:border-none print:p-0 print:shadow-none">

      {/* ── Cabeçalho ── */}
      <div className="flex justify-between items-start pb-4 border-b border-gray-200">
        <div>
          <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-0.5">ADTRISC</p>
          <h2 className="text-xl font-extrabold text-navy-500">Relatório Mensal de Turma</h2>
          <p className="text-base font-semibold text-navy-500 mt-1.5">
            {turma.nome}
            <span className="font-normal text-gray-400"> · {MODALIDADE_LABEL[turma.modalidade] ?? turma.modalidade}</span>
          </p>
          {turma.coaches?.full_name && (
            <p className="text-xs text-gray-400 mt-0.5">Coach: {turma.coaches.full_name}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="text-base font-bold text-navy-500">{MESES_LABEL[mes]} / {ano}</p>
          <p className="mt-0.5">{formatarDiasSemana(turma.dias_semana)} · {formatarHorario(turma.horario_inicio)}–{formatarHorario(turma.horario_fim)}</p>
          <p className="mt-3">Gerado em {geradoEm}</p>
        </div>
      </div>

      {/* ── Resumo em cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
        <ResumoCard label="Atletas ativos" value={String(alunos.length)} />
        <ResumoCard label="Aulas registradas" value={String(datas.length)} />
        <ResumoCard
          label="Frequência média"
          value={overallPct != null ? `${overallPct}%` : '—'}
          valueColor={overallPct == null ? '' : overallPct >= 75 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-500' : 'text-red-500'}
        />
        <ResumoCard
          label="Freq. ≥ 75%"
          value={`${alunos75} / ${alunos.length}`}
          valueColor={alunos75 === alunos.length ? 'text-emerald-600' : 'text-amber-500'}
        />
      </div>

      {/* ── Grid de chamada ── */}
      {hasSessions ? (
        <>
          {/* Legenda — somente tela */}
          <div className="print:hidden flex gap-4 text-xs text-gray-500">
            {[
              { label: 'Presente', bg: 'bg-emerald-100', text: 'text-emerald-700', char: 'P' },
              { label: 'Falta',    bg: 'bg-red-100',     text: 'text-red-600',     char: 'F' },
              { label: 'Justif.',  bg: 'bg-amber-100',   text: 'text-amber-600',   char: 'J' },
            ].map((l) => (
              <span key={l.char} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded ${l.bg} ${l.text} flex items-center justify-center font-bold text-xs`}>{l.char}</span>
                {l.label}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table
              className="border-collapse text-xs"
              style={{
                tableLayout: 'fixed',
                width: `${180 + datas.length * dateColW + 90}px`,
                minWidth: '100%',
              }}
            >
              <colgroup>
                <col style={{ width: '180px', minWidth: '120px' }} />
                <col style={{ width: '28px' }} />
                <col style={{ width: '32px' }} />
                {datas.map((d) => <col key={d} style={{ width: `${dateColW}px` }} />)}
                <col style={{ width: '44px' }} />
                <col style={{ width: '44px' }} />
              </colgroup>

              <thead>
                <tr style={{ backgroundColor: '#0C143D' }}>
                  <th className="text-left px-3 py-2 font-semibold text-white text-xs">Atleta</th>
                  <th className="text-center py-1.5 px-0 font-semibold text-white text-[10px]">Sex.</th>
                  <th className="text-center py-1.5 px-0 font-semibold text-white text-[10px]">Idade</th>
                  {datas.map((d) => {
                    const { day, weekday } = formatDateCol(d)
                    return (
                      <th key={d} className="text-center py-1 px-0 font-semibold text-white leading-tight">
                        <span className="block text-[9px] opacity-60">{weekday}</span>
                        <span className="block text-[10px]">{day}</span>
                      </th>
                    )
                  })}
                  <th className="text-center px-1 py-2 font-semibold text-white text-[10px] leading-tight">Pres.</th>
                  <th className="text-center px-1 py-2 font-semibold text-white text-[10px] leading-tight">Freq.</th>
                </tr>
              </thead>

              <tbody>
                {alunoStats.map(({ aluno, presentes, total, pct }, idx) => {
                  const alunoMap = presencaMap.get(aluno.id) ?? new Map<string, Estado>()
                  const idade = aluno.data_nascimento ? calcularIdade(aluno.data_nascimento) : null
                  const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  return (
                    <tr key={aluno.id} className={rowBg}>
                      <td className="px-3 py-1.5 font-medium text-navy-500 text-xs border-b border-gray-100 truncate">
                        {aluno.nome}
                      </td>
                      <td className="text-center py-1.5 text-[10px] text-gray-400 border-b border-gray-100">
                        {aluno.sexo ? SEX_LABEL[aluno.sexo] ?? aluno.sexo : '—'}
                      </td>
                      <td className="text-center py-1.5 text-[10px] text-gray-400 border-b border-gray-100">
                        {idade ?? '—'}
                      </td>
                      {datas.map((data) => {
                        const estado = alunoMap.get(data)
                        if (estado === 'P')
                          return <td key={data} className="text-center border-b border-gray-100 p-0"><span className="block py-1.5 bg-emerald-100 text-emerald-700 font-bold text-[10px]">P</span></td>
                        if (estado === 'F')
                          return <td key={data} className="text-center border-b border-gray-100 p-0"><span className="block py-1.5 bg-red-100 text-red-600 font-bold text-[10px]">F</span></td>
                        if (estado === 'J')
                          return <td key={data} className="text-center border-b border-gray-100 p-0"><span className="block py-1.5 bg-amber-100 text-amber-600 font-bold text-[10px]">J</span></td>
                        return <td key={data} className="text-center border-b border-gray-100 p-0"><span className="block py-1.5 text-gray-200 text-[10px]">—</span></td>
                      })}
                      <td className="text-center py-1.5 px-1 text-xs font-semibold text-gray-600 border-b border-gray-100">
                        {total > 0 ? `${presentes}/${total}` : '—'}
                      </td>
                      <td className={`text-center py-1.5 px-1 text-xs font-bold border-b border-gray-100 ${
                        pct == null ? 'text-gray-300' : pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {pct != null ? `${pct}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot>
                <tr style={{ backgroundColor: '#eeeef4' }}>
                  <td className="px-3 py-2 text-xs font-bold text-navy-500" colSpan={3}>
                    Total · Freq. média{' '}
                    {overallPct != null && (
                      <span className={overallPct >= 75 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-500' : 'text-red-500'}>
                        {overallPct}%
                      </span>
                    )}
                  </td>
                  {dataStats.map(({ data, presentes, total }) => (
                    <td key={data} className="text-center py-2 text-[10px] font-semibold text-navy-500 leading-tight">
                      {total > 0 ? <><span className="block">{presentes}</span><span className="block opacity-50">/{total}</span></> : <span className="text-gray-300">—</span>}
                    </td>
                  ))}
                  <td className={`text-center py-2 px-1 text-xs font-bold ${
                    overallPct == null ? 'text-gray-300' : overallPct >= 75 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`} colSpan={2}>
                    {overallTotal > 0 ? `${overallPresentes}/${overallTotal}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
          Nenhuma aula registrada neste período.
        </div>
      )}

      {/* ── Atletas sem presença registrada ── */}
      {hasSessions && alunosBaixo > 0 && (
        <div className="print:hidden text-xs text-gray-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          {alunosBaixo} atleta{alunosBaixo !== 1 ? 's' : ''} com frequência abaixo de 75%
        </div>
      )}

      {/* ── Galeria de fotos do período ── */}
      {fotos.length > 0 && (
        <div className="pt-2">
          <div className="border-t border-gray-200 pt-5 mb-4">
            <h3 className="text-sm font-bold text-navy-500">
              Fotos do período
              <span className="ml-2 text-xs font-normal text-gray-400">({fotos.length} foto{fotos.length !== 1 ? 's' : ''})</span>
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-4 print:gap-3">
            {fotos.map((foto) => (
              <div key={foto.id} className="rounded-xl overflow-hidden border border-gray-200 break-inside-avoid">
                <div
                  className="relative bg-gray-100"
                  style={{ paddingBottom: '62.5%' /* 16:10 ratio */ }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={foto.url}
                    alt={foto.titulo}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="px-3 py-2 bg-white">
                  <p className="text-xs font-semibold text-navy-500 truncate">{foto.titulo}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(foto.data)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rodapé de assinatura — somente print ── */}
      <div className="hidden print:block pt-6 mt-2 border-t border-gray-300">
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

function ResumoCard({ label, value, valueColor = 'text-navy-500' }: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 print:border-gray-300">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-extrabold ${valueColor}`}>{value}</p>
    </div>
  )
}
