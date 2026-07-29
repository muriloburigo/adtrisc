import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import {
  formatarDiasSemana,
  formatarHorario,
  formatTelefone,
} from '@/lib/utils'
import type { TurmaRow, DiaSemana } from '@/types/database'
import RelatorioForm from './RelatorioForm'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}) {
  const { id } = await params
  const sp = await searchParams
  const mes = Number(sp.mes) || new Date().getMonth() + 1
  const ano = Number(sp.ano) || new Date().getFullYear()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('turmas').select('nome').eq('id', id).single()
  const turma = data?.nome ?? ''
  return { title: `ADTRISC ${turma} ${MESES_LABEL[mes]} ${ano}` }
}

const MESES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const MESES_EXTENSO = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

type TurmaWithCoach = TurmaRow & { coaches: { full_name: string | null; cref: string | null } | null }
type AlunoBasic = {
  id: string
  nome: string
  telefone: string | null
}
type PresencaEntry = { aluno_id: string; data: string; presente: boolean; justificada: boolean }
type Estado = 'P' | 'F' | 'J'

function ultimoDiaMes(ano: number, mes: number): string {
  return new Date(ano, mes, 0).toLocaleDateString('en-CA')
}

function ultimoDia(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
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
  const mes    = Number(sp.mes)  || now.getMonth() + 1
  const ano    = Number(sp.ano)  || now.getFullYear()
  const local  = sp.local  ?? 'Beira Mar São José'
  const cidade = sp.cidade ?? 'São José'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
  const dataFim    = ultimoDiaMes(ano, mes)

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
    supabase
      .from('turmas')
      .select('*, coaches:coach_id ( full_name, cref )')
      .eq('id', id)
      .single(),
    supabase
      .from('alunos')
      .select('id, nome, telefone')
      .eq('turma_id', id)
      .eq('status', 'ativo')
      .order('nome'),
    supabase
      .from('presencas')
      .select('aluno_id, data, presente, justificada')
      .eq('turma_id', id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .is('deleted_at', null)
      .order('data'),
  ])

  if (!turmaRaw) notFound()

  const turma    = turmaRaw as TurmaWithCoach & { dias_semana: DiaSemana[] }
  const alunos   = (alunosRaw   ?? []) as AlunoBasic[]
  const presencas = (presencasRaw ?? []) as PresencaEntry[]

  // Responsáveis (principal primeiro)
  const respMap: Record<string, string> = {}
  if (alunos.length > 0) {
    const { data: respLinks } = await supabase
      .from('aluno_responsavel')
      .select('aluno_id, principal, responsaveis(nome)')
      .in('aluno_id', alunos.map((a: AlunoBasic) => a.id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const link of (respLinks ?? []) as any[]) {
      if (link.principal && link.responsaveis?.nome) respMap[link.aluno_id] = link.responsaveis.nome
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const link of (respLinks ?? []) as any[]) {
      if (!respMap[link.aluno_id] && link.responsaveis?.nome) respMap[link.aluno_id] = link.responsaveis.nome
    }
  }

  const datasSet = new Set<string>()
  for (const p of presencas) datasSet.add(p.data)
  const datas = [...datasSet].sort()

  const presencaMap = new Map<string, Map<string, Estado>>()
  for (const a of alunos) presencaMap.set(a.id, new Map())
  for (const p of presencas) {
    presencaMap.get(p.aluno_id)?.set(p.data, p.presente ? 'P' : p.justificada ? 'J' : 'F')
  }

  const hasSessions = datas.length > 0
  const year = ano
  const coachName = turma.coaches?.full_name ?? ''
  const coachCref = turma.coaches?.cref ?? ''

  const dateColW = datas.length <= 18 ? 26 : datas.length <= 26 ? 22 : 18

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 5mm 6mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-page {
            display: flex !important;
            flex-direction: column !important;
            height: 183mm !important;
          }
          .print-footer {
            margin-top: auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="p-4 sm:p-8 max-w-7xl space-y-6">

        {/* Controles — somente tela */}
        <div className="print:hidden">
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-3">
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
            {hasSessions && <PrintButton />}
          </div>

          <Card>
            <RelatorioForm mes={mes} ano={ano} local={local} cidade={cidade} />
          </Card>

          {!hasSessions && (
            <p className="text-sm text-gray-400 text-center py-10">
              Nenhuma presença registrada para {MESES_LABEL[mes].toLowerCase()} de {ano}.
            </p>
          )}
        </div>

        {/* Documento imprimível */}
        {(hasSessions || true) && (
          <div className={`print-page ${hasSessions ? '' : 'hidden print:block'}`} style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* ── Logo header ── */}
            <div className="flex justify-between items-center mb-1 pb-1" style={{ borderBottom: '2px solid #0C143D' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-escolinha.png" alt="ADTRISC Escolinha de Triathlon" style={{ height: 56, objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos-estado.png" alt="PIE · Fesporte · Governo de Santa Catarina" style={{ height: 42, objectFit: 'contain' }} />
            </div>

            {/* ── Título ── */}
            <p className="text-center font-bold uppercase mb-1" style={{ fontSize: 12 }}>
              Lista de Presença – {year}
            </p>

            {/* ── Bloco de informações ── */}
            <div className="mb-2" style={{ border: '1px solid #555', fontSize: 9 }}>
              <div className="flex" style={{ borderBottom: '1px solid #555' }}>
                <div className="flex-1 px-2" style={{ padding: '3px 8px' }}>
                  <span className="font-bold uppercase">Nome da OSC: </span>
                  Associação Desportiva Triatlética de Santa Catarina/ADTRISC
                </div>
              </div>
              <div style={{ padding: '3px 8px', borderBottom: '1px solid #555' }}>
                <span className="font-bold uppercase">Local do Atendimento: </span>
                {local}
              </div>
              <div style={{ padding: '3px 8px' }}>
                <span className="font-bold uppercase">Turma: </span>{turma.nome}
                <span className="mx-3">|</span>
                <span className="font-bold uppercase">Dias da Semana: </span>{formatarDiasSemana(turma.dias_semana)}
                <span className="mx-3">|</span>
                <span className="font-bold uppercase">Horário: </span>
                {formatarHorario(turma.horario_inicio)} às {formatarHorario(turma.horario_fim)}
              </div>
            </div>

            {/* ── Resumo em cards — somente tela ── */}
            {hasSessions && (
              <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-0.5">Atletas ativos</p>
                  <p className="text-xl font-extrabold text-navy-500">{alunos.length}</p>
                </div>
                <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-0.5">Aulas registradas</p>
                  <p className="text-xl font-extrabold text-navy-500">{datas.length}</p>
                </div>
                <div className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50">
                  <p className="text-xs text-gray-400 mb-0.5">Mês / Ano</p>
                  <p className="text-xl font-extrabold text-navy-500">{MESES_LABEL[mes].slice(0, 3)} / {ano}</p>
                </div>
              </div>
            )}

            {/* ── Tabela ── */}
            {hasSessions && (
              <div className="overflow-x-auto">
                <table
                  className="border-collapse w-full"
                  style={{
                    fontSize: 9,
                    tableLayout: 'fixed',
                    width: `${28 + 160 + 90 + 130 + datas.length * dateColW}px`,
                    minWidth: '100%',
                  }}
                >
                  <colgroup>
                    <col style={{ width: 28 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 130 }} />
                    {datas.map((d) => <col key={d} style={{ width: dateColW }} />)}
                  </colgroup>

                  <thead>
                    <tr style={{ backgroundColor: '#0C143D', color: '#fff' }}>
                      <th style={{ textAlign: 'center', padding: '4px 2px', fontSize: 8, fontWeight: 700 }}>Nº</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 8, fontWeight: 700 }}>NOME DO ALUNO</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 8, fontWeight: 700 }}>TELEFONE</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 8, fontWeight: 700 }}>RESPONSÁVEL</th>
                      {datas.map((d) => (
                        <th key={d} style={{ textAlign: 'center', padding: '4px 2px', fontSize: 8, fontWeight: 700 }}>
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
                          <td style={{ textAlign: 'center', padding: '3px 2px', border: '1px solid #ccc', fontSize: 9 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '3px 6px', border: '1px solid #ccc', fontSize: 9, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {aluno.nome}
                          </td>
                          <td style={{ padding: '3px 6px', border: '1px solid #ccc', fontSize: 9 }}>
                            {formatTelefone(aluno.telefone)}
                          </td>
                          <td style={{ padding: '3px 6px', border: '1px solid #ccc', fontSize: 9, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {respMap[aluno.id] ?? ''}
                          </td>
                          {datas.map((data) => {
                            const estado = alunoMap.get(data)
                            const symbol = estado === 'P' ? '.' : estado === 'F' ? 'F' : estado === 'J' ? 'J' : ''
                            const color  = estado === 'F' ? '#dc2626' : estado === 'J' ? '#d97706' : 'inherit'
                            return (
                              <td key={data} style={{ textAlign: 'center', padding: '3px 2px', border: '1px solid #ccc', fontSize: 10, fontWeight: 700, color }}>
                                {symbol}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* Legenda — somente tela */}
                <div className="print:hidden flex gap-4 mt-3 text-xs text-gray-500">
                  <span><strong>.</strong> = Presente</span>
                  <span><strong style={{ color: '#dc2626' }}>F</strong> = Falta</span>
                  <span><strong style={{ color: '#d97706' }}>J</strong> = Justificada</span>
                </div>
              </div>
            )}

            {/* ── Rodapé de assinatura ── */}
            <div className="print-footer mt-6 flex justify-between items-end" style={{ fontSize: 10, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <div>
                <div style={{ borderBottom: '1px solid #555', width: 280, paddingBottom: 20, marginBottom: 4 }} />
                <p style={{ margin: 0, fontWeight: 700 }}>Treinador(a) Responsável</p>
                {coachName && (
                  <p style={{ margin: '2px 0 0' }}>
                    {coachName}{coachCref ? ` – CREF ${coachCref}` : ''}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0 }}>
                  {cidade}, {ultimoDia(ano, mes)} de {MESES_EXTENSO[mes]} de {ano}.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
