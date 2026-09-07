import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, secondsToMmss } from '@/lib/utils'
import { UserPlus, ArrowRight, UserMinus, RefreshCw, Dumbbell, Trophy } from 'lucide-react'
import type { HistoricoAtletaRow } from '@/types/database'

type EventoTipo = HistoricoAtletaRow['tipo'] | 'avaliacao' | 'prova'

type Evento = {
  key: string
  tipo: EventoTipo
  data: string
  titulo: string
  descricao?: string
  href?: string
}

const CONFIG: Record<EventoTipo, {
  icon: React.ComponentType<{ size?: number; className?: string }>
  bg: string
  fg: string
  label: string
}> = {
  matricula:     { icon: UserPlus,    bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Matrícula'         },
  mudanca_turma: { icon: ArrowRight,  bg: 'bg-sky-100',     fg: 'text-sky-500',     label: 'Mudança de Turma'  },
  desligamento:  { icon: UserMinus,   bg: 'bg-red-100',     fg: 'text-red-500',     label: 'Desligamento'      },
  reativacao:    { icon: RefreshCw,   bg: 'bg-emerald-100', fg: 'text-emerald-600', label: 'Reativação'        },
  avaliacao:     { icon: Dumbbell,    bg: 'bg-violet-100',  fg: 'text-violet-600',  label: 'Avaliação Física'  },
  prova:         { icon: Trophy,      bg: 'bg-amber-100',   fg: 'text-amber-600',   label: 'Prova'             },
}

export default async function AlunoTimeline({
  alunoId,
  turmaId,
}: {
  alunoId: string
  turmaId: string | null
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: historico }, { data: avaliacoes }, { data: resultados }] = await Promise.all([
    supabase
      .from('historico_atleta')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('avaliacoes_fisicas')
      .select('data')
      .eq('aluno_id', alunoId)
      .is('deleted_at', null)
      .order('data', { ascending: false }),
    supabase
      .from('resultados_prova')
      .select('id, colocacao_geral, colocacao_categoria, tempo_total_segundos, prova:prova_id ( id, nome, data ), categoria:categoria_id ( nome )')
      .eq('aluno_id', alunoId),
  ])

  const eventos: Evento[] = []

  // Eventos do histórico
  for (const h of (historico ?? []) as HistoricoAtletaRow[]) {
    let descricao: string | undefined
    if (h.tipo === 'matricula') {
      descricao = h.turma_nome ? `Turma: ${h.turma_nome}` : undefined
    } else if (h.tipo === 'mudanca_turma') {
      const de   = h.turma_anterior_nome ?? '?'
      const para = h.turma_nome ?? '?'
      descricao = `${de} → ${para}`
    } else if (h.tipo === 'desligamento') {
      descricao = h.turma_anterior_nome ? `Turma: ${h.turma_anterior_nome}` : undefined
    } else if (h.tipo === 'reativacao') {
      descricao = h.turma_nome ? `Turma: ${h.turma_nome}` : undefined
    }
    eventos.push({
      key:       h.id,
      tipo:      h.tipo,
      data:      h.data,
      titulo:    CONFIG[h.tipo].label,
      descricao,
    })
  }

  // Eventos de avaliação — agrupados por data
  const datasAva = [...new Set((avaliacoes ?? []).map((a: { data: string }) => a.data))] as string[]
  for (const data of datasAva) {
    eventos.push({
      key:    `ava__${data}`,
      tipo:   'avaliacao',
      data,
      titulo: 'Avaliação Física',
      href:   turmaId ? `/avaliacoes/${turmaId}/${data}` : undefined,
    })
  }

  // Eventos de resultados de provas
  type ResultadoJoined = {
    id: string
    colocacao_geral: number | null
    colocacao_categoria: number | null
    tempo_total_segundos: number | null
    prova: { id: string; nome: string; data: string } | null
    categoria: { nome: string } | null
  }
  for (const r of ((resultados ?? []) as unknown as ResultadoJoined[])) {
    if (!r.prova) continue
    const partes: string[] = []
    if (r.categoria?.nome) partes.push(r.categoria.nome)
    if (r.tempo_total_segundos != null) partes.push(secondsToMmss(r.tempo_total_segundos))
    if (r.colocacao_geral != null) partes.push(`${r.colocacao_geral}º geral`)
    if (r.colocacao_categoria != null) partes.push(`${r.colocacao_categoria}º categoria`)
    eventos.push({
      key:       `prova__${r.id}`,
      tipo:      'prova',
      data:      r.prova.data,
      titulo:    r.prova.nome,
      descricao: partes.join(' • '),
      href:      `/provas/${r.prova.id}`,
    })
  }

  // Ordenar por data decrescente, depois por created_at (para histórico no mesmo dia)
  eventos.sort((a, b) => {
    if (b.data !== a.data) return b.data.localeCompare(a.data)
    // avaliacao vai após eventos de histórico no mesmo dia
    if (a.tipo === 'avaliacao' && b.tipo !== 'avaliacao') return 1
    if (b.tipo === 'avaliacao' && a.tipo !== 'avaliacao') return -1
    return 0
  })

  if (eventos.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-navy-500 mb-4">Histórico</h2>
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-[13px] top-5 bottom-2 w-px bg-gray-200" />

        <div className="space-y-0">
          {eventos.map((ev, idx) => {
            const cfg = CONFIG[ev.tipo]
            const Icon = cfg.icon
            const isLast = idx === eventos.length - 1

            const content = (
              <div className={`relative flex gap-3 ${isLast ? 'pb-0' : 'pb-5'}`}>
                {/* Ícone */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${cfg.bg}`}>
                  <Icon size={13} className={cfg.fg} />
                </div>
                {/* Texto */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[11px] text-gray-400 leading-none mb-0.5">{formatDate(ev.data)}</p>
                  <p className={`text-sm font-semibold leading-tight ${ev.href ? 'text-sky-500 hover:text-sky-600' : 'text-navy-500'}`}>
                    {ev.titulo}
                  </p>
                  {ev.descricao && (
                    <p className="text-xs text-gray-500 mt-0.5">{ev.descricao}</p>
                  )}
                </div>
              </div>
            )

            return ev.href ? (
              <Link key={ev.key} href={ev.href}>
                {content}
              </Link>
            ) : (
              <div key={ev.key}>{content}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
