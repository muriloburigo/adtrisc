import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Card from '@/components/ui/Card'
import { ArrowLeft } from 'lucide-react'
import {
  formatarDiasSemana,
  formatarHorario,
  formatDate,
  formatTelefone,
} from '@/lib/utils'
import type { TurmaRow, TurmaFotoRow, DiaSemana } from '@/types/database'
import RelatorioForm from './RelatorioForm'
import PrintButton from './PrintButton'

export const dynamic = 'force-dynamic'

const MESES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type TurmaWithCoach = TurmaRow & { coaches: { full_name: string | null } | null }
type AlunoBasic = {
  id: string
  nome: string
  telefone: string | null
  sexo: string | null
}
type PresencaEntry = { aluno_id: string; data: string; presente: boolean; justificada: boolean }
type Estado = 'P' | 'F' | 'J'

function ultimoDiaMes(ano: number, mes: number): string {
  return new Date(ano, mes, 0).toLocaleDateString('en-CA')
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
  const mes   = Number(sp.mes)  || now.getMonth() + 1
  const ano   = Number(sp.ano)  || now.getFullYear()
  const local = sp.local ?? 'Beira Mar São José'

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
      .select('id, nome, telefone, sexo')
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
    adminDb
      .from('turma_fotos')
      .select('*')
      .eq('turma_id', id)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true }),
  ])

  if (!turmaRaw) notFound()

  const turma    = turmaRaw as TurmaWithCoach & { dias_semana: DiaSemana[] }
  const alunos   = (alunosRaw   ?? []) as AlunoBasic[]
  const presencas = (presencasRaw ?? []) as PresencaEntry[]
  const fotos    = (fotosRaw    ?? []) as TurmaFotoRow[]

  // Fetch responsaveis
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

  const dateColW = datas.length <= 18 ? 26 : datas.length <= 26 ? 22 : 18

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .foto-row { break-inside: avoid !important; page-break-inside: avoid !important; }
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
            <RelatorioForm mes={mes} ano={ano} local={local} />
          </Card>

          {!hasSessions && (
            <p className="text-sm text-gray-400 text-center py-10">
              Nenhuma presença registrada para {MESES_LABEL[mes].toLowerCase()} de {ano}.
            </p>
          )}
        </div>

        {/* Documento imprimível */}
        {(hasSessions || true) && (
          <div className={hasSessions ? '' : 'hidden print:block'} style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* ── Logo header ── */}
            <div className="flex justify-between items-center mb-2 pb-2" style={{ borderBottom: '2px solid #0C143D' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-escolinha.png" alt="ADTRISC Escolinha de Triathlon" style={{ height: 72, objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logos-estado.png" alt="PIE · Fesporte · Governo de Santa Catarina" style={{ height: 52, objectFit: 'contain' }} />
            </div>

            {/* ── Title ── */}
            <p className="text-center font-bold uppercase mb-2" style={{ fontSize: 13 }}>
              Lista de Presença – {year}
            </p>

            {/* ── Info block ── */}
            <div className="mb-3" style={{ border: '1px solid #555', fontSize: 10 }}>
              <div className="flex" style={{ borderBottom: '1px solid #555' }}>
                <div className="flex-1 px-2 py-1">
                  <span className="font-bold uppercase">Nome da OSC: </span>
                  Associação Desportiva Triatlética de Santa Catarina/ADTRISC
                </div>
              </div>
              <div className="px-2 py-1" style={{ borderBottom: '1px solid #555' }}>
                <span className="font-bold uppercase">Local do Atendimento: </span>
                {local}
              </div>
              <div className="px-2 py-1">
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
                        <th key={d} className="text-center py-1 font-bold" style={{ fontSize: 8 }}>
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

                {/* Legenda — somente tela */}
                <div className="print:hidden flex gap-4 mt-3 text-xs text-gray-500">
                  <span><strong>X</strong> = Presente</span>
                  <span><strong>J</strong> = Justificada</span>
                  <span className="text-gray-300">(vazio = falta / não registrado)</span>
                </div>
              </div>
            )}

            {/* ── Galeria de fotos ── */}
            {fotos.length > 0 && (() => {
              const rows: TurmaFotoRow[][] = []
              for (let i = 0; i < fotos.length; i += 3) rows.push(fotos.slice(i, i + 3))
              return (
                <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 16, breakBefore: 'page', pageBreakBefore: 'always' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#0C143D', marginBottom: 10 }}>
                    Fotos do período
                    <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>({fotos.length} foto{fotos.length !== 1 ? 's' : ''})</span>
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '33.33%' }} />
                      <col style={{ width: '33.33%' }} />
                      <col style={{ width: '33.33%' }} />
                    </colgroup>
                    <tbody>
                      {rows.map((row, rowIdx) => (
                        <tr key={rowIdx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          {row.map((foto) => (
                            <td key={foto.id} style={{ padding: '0 6px 10px', verticalAlign: 'top' }}>
                              <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#f9fafb' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={foto.url}
                                  alt={foto.titulo}
                                  style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block', borderRadius: '10px 10px 0 0' }}
                                />
                                <div style={{ padding: '6px 10px 8px', background: '#fff', borderRadius: '0 0 10px 10px' }}>
                                  <p style={{ fontSize: 10, fontWeight: 600, color: '#0C143D', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: 0 }}>{foto.titulo}</p>
                                  <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>{formatDate(foto.data)}</p>
                                </div>
                              </div>
                            </td>
                          ))}
                          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                            <td key={i} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            {/* ── Assinatura — somente impressão ── */}
            <div className="hidden print:flex mt-8 gap-16 text-xs text-gray-500">
              <div className="flex-1">
                <div style={{ borderBottom: '1px solid #555', paddingBottom: 24, marginBottom: 4 }} />
                <p>Assinatura do Treinador</p>
              </div>
              <div style={{ width: 160 }}>
                <div style={{ borderBottom: '1px solid #555', paddingBottom: 24, marginBottom: 4 }} />
                <p>Data</p>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  )
}
