import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { Users, Users2, CalendarCheck, Dumbbell, Clock, ChevronRight } from 'lucide-react'
import { formatDate, formatarDiasSemana, formatarHorario, calcularIdade } from '@/lib/utils'
import type { DiaSemana } from '@/types/database'

type TurmaCard = {
  id: string; nome: string; modalidade: string; status: string
  dias_semana: DiaSemana[]; horario_inicio: string; horario_fim: string
  capacidade: number; coaches: { full_name: string | null } | null
}
type SessaoRecente = { turma_id: string; data: string; turma_nome: string; total: number; presentes: number }
type UltimoAtleta = { id: string; nome: string; data_nascimento: string | null; turmas: { nome: string } | null }

export default async function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const mesAtras = new Date()
  mesAtras.setDate(mesAtras.getDate() - 30)
  const dataCorte = mesAtras.toISOString().slice(0, 10)

  const [
    { count: atletasAtivos },
    { count: totalTurmas },
    { count: totalAvaliacoes },
    { data: turmasRaw },
    { data: atletasRaw },
    { data: presencasCountRaw },
    { data: ultimosAtletasRaw },
    { data: sessoesRaw },
  ] = await Promise.all([
    supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('avaliacoes_fisicas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('turmas').select('id, nome, modalidade, status, dias_semana, horario_inicio, horario_fim, capacidade, coaches:coach_id ( full_name )').eq('status', 'ativa').order('nome'),
    supabase.from('alunos').select('turma_id').eq('status', 'ativo').not('turma_id', 'is', null),
    // Apenas os IDs e datas para contar sessões únicas no mês
    supabase.from('presencas').select('turma_id, data').gte('data', dataCorte).is('deleted_at', null).limit(1000),
    supabase.from('alunos').select('id, nome, data_nascimento, turmas:turma_id ( nome )').order('created_at', { ascending: false }).limit(5),
    // sessoes recentes (reduzido de 300 para 150 para processamento mais rápido)
    supabase.from('presencas').select('turma_id, data, presente, turmas!inner(nome)').is('deleted_at', null).order('data', { ascending: false }).limit(150),
  ])

  // Contagem de atletas por turma
  const atletasMap: Record<string, number> = {}
  for (const a of (atletasRaw ?? []) as { turma_id: string }[]) {
    atletasMap[a.turma_id] = (atletasMap[a.turma_id] ?? 0) + 1
  }

  // Sessões do mês (distinct turma+data)
  const sessoesDoMes = new Set(
    (presencasCountRaw ?? []).map((r: { turma_id: string; data: string }) => `${r.turma_id}__${r.data}`)
  ).size

  // Sessões recentes agrupadas
  const sessaoMap = new Map<string, SessaoRecente>()
  for (const row of sessoesRaw ?? []) {
    const key = `${row.turma_id}__${row.data}`
    if (!sessaoMap.has(key)) {
      sessaoMap.set(key, { turma_id: row.turma_id, data: row.data, turma_nome: row.turmas?.nome ?? '—', total: 0, presentes: 0 })
    }
    const s = sessaoMap.get(key)!
    s.total++
    if (row.presente) s.presentes++
  }
  const sessoesRecentes = [...sessaoMap.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)

  const turmas = (turmasRaw ?? []) as TurmaCard[]
  const ultimosAtletas = (ultimosAtletasRaw ?? []) as UltimoAtleta[]

  const stats = [
    { label: 'Atletas ativos',       value: atletasAtivos  ?? 0, icon: Users,         color: 'text-sky-400',     href: '/alunos'    },
    { label: 'Turmas ativas',        value: totalTurmas    ?? 0, icon: Users2,        color: 'text-emerald-500', href: '/turmas'    },
    { label: 'Sessões (30 dias)',     value: sessoesDoMes,        icon: CalendarCheck, color: 'text-amber-500',   href: '/presencas' },
    { label: 'Avaliações físicas',   value: totalAvaliacoes ?? 0, icon: Dumbbell,      color: 'text-violet-500',  href: '/avaliacoes'},
  ]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-500">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão geral da escolinha</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">{label}</p>
                <Icon size={18} className={color} />
              </div>
              <p className="text-3xl font-bold text-navy-500">{value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Ocupação das turmas — 2/3 da largura */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy-500">Ocupação das turmas</h2>
            <Link href="/turmas" className="text-xs text-sky-400 hover:underline flex items-center gap-0.5">
              Ver todas <ChevronRight size={12} />
            </Link>
          </div>

          {turmas.length === 0 ? (
            <Card>
              <p className="text-sm text-gray-400 py-4 text-center">Nenhuma turma ativa.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {turmas.map((t) => {
                const ativos = atletasMap[t.id] ?? 0
                const pct    = t.capacidade > 0 ? (ativos / t.capacidade) * 100 : 0
                const acima  = ativos > t.capacidade
                const exata  = ativos === t.capacidade
                const quase  = !acima && !exata && pct >= 80
                const barColor  = acima ? 'bg-red-400' : exata ? 'bg-emerald-400' : quase ? 'bg-amber-400' : 'bg-emerald-400'
                const textColor = acima ? 'text-red-500' : exata ? 'text-emerald-600' : quase ? 'text-amber-500' : 'text-emerald-600'
                return (
                  <Link key={t.id} href={`/turmas/${t.id}`}>
                    <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-navy-500 text-sm leading-tight">{t.nome}</p>
                        {exata && (
                          <span className="flex-shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Completa</span>
                        )}
                        {acima && (
                          <span className="flex-shrink-0 text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">Acima da cap.</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2">{t.modalidade}</p>

                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} className="text-sky-400" />
                          <span>{formatarDiasSemana(t.dias_semana)} · {formatarHorario(t.horario_inicio)}</span>
                        </div>
                        <span className="text-xs font-semibold">
                          <span className={textColor}>{ativos}</span>
                          <span className="text-gray-400"> / {t.capacidade}</span>
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>

                      {t.coaches?.full_name && (
                        <p className="text-[11px] text-gray-400 mt-2">{t.coaches.full_name}</p>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="space-y-6">

          {/* Presenças recentes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-500">Presenças recentes</h2>
              <Link href="/presencas" className="text-xs text-sky-400 hover:underline flex items-center gap-0.5">
                Ver <ChevronRight size={12} />
              </Link>
            </div>
            {sessoesRecentes.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-400 py-4 text-center">Nenhuma sessão registrada.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {sessoesRecentes.map((s) => {
                  const pct = s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0
                  const pctColor = pct >= 75 ? 'text-emerald-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400'
                  return (
                    <Link key={`${s.turma_id}__${s.data}`} href={`/presencas/${s.turma_id}/${s.data}`}>
                      <Card className="hover:border-sky-400 transition-colors cursor-pointer py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-navy-500 truncate">{s.turma_nome}</p>
                            <p className="text-[11px] text-gray-400">{formatDate(s.data)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-navy-500">{s.presentes}/{s.total}</p>
                            <p className={`text-[11px] font-medium ${pctColor}`}>{pct}%</p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Últimos atletas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-navy-500">Últimos atletas</h2>
              <Link href="/alunos" className="text-xs text-sky-400 hover:underline flex items-center gap-0.5">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>
            {ultimosAtletas.length === 0 ? (
              <Card>
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum(a) atleta ainda.</p>
              </Card>
            ) : (
              <Card padding={false}>
                <div className="divide-y divide-gray-100">
                  {ultimosAtletas.map((a) => (
                    <Link
                      key={a.id}
                      href={`/alunos/${a.id}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-500 truncate">{a.nome}</p>
                        <p className="text-xs text-gray-400 truncate">{a.turmas?.nome ?? 'Sem turma'}</p>
                      </div>
                      {a.data_nascimento && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{calcularIdade(a.data_nascimento)} anos</span>
                      )}
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
