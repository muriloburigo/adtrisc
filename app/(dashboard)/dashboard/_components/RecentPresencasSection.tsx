import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type SessaoRecente = { turma_id: string; data: string; turma_nome: string; total: number; presentes: number }

export default async function RecentPresencasSection() {
  const supabase = await createClient()

  const { data: sessoesRaw } = await supabase
    .from('presencas')
    .select('turma_id, data, presente, turmas!inner(nome)')
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(150)

  // Sessões recentes agrupadas
  const sessaoMap = new Map<string, SessaoRecente>()
  const rows = (sessoesRaw ?? []) as any[]
  for (const row of rows) {
    const key = `${row.turma_id}__${row.data}`
    if (!sessaoMap.has(key)) {
      sessaoMap.set(key, {
        turma_id: row.turma_id,
        data: row.data,
        turma_nome: row.turmas?.nome ?? '—',
        total: 0,
        presentes: 0
      })
    }
    const s = sessaoMap.get(key)!
    s.total++
    if (row.presente) s.presentes++
  }
  const sessoesRecentes = [...sessaoMap.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)

  return (
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
  )
}
