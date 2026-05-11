import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { Clock, ChevronRight } from 'lucide-react'
import { formatarDiasSemana, formatarHorario } from '@/lib/utils'
import type { DiaSemana } from '@/types/database'

type TurmaCard = {
  id: string; nome: string; modalidade: string; status: string
  dias_semana: DiaSemana[]; horario_inicio: string; horario_fim: string
  capacidade: number; coaches: { full_name: string | null } | null
  alunos: { count: number }[]
}

export default async function TurmasOcupacaoSection() {
  const supabase = await createClient()

  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome, modalidade, status, dias_semana, horario_inicio, horario_fim, capacidade, coaches:coach_id ( full_name ), alunos(count)')
    .eq('status', 'ativa')
    .eq('alunos.status', 'ativo')
    .order('nome')

  const turmas = (turmasRaw ?? []) as any[]

  return (
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
            const ativos = t.alunos?.[0]?.count ?? 0
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
                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
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
  )
}
