import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { getAlertasFaltas } from '@/lib/faltasAlerta'

export default async function FaltasAlertSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const alertas = await getAlertasFaltas(supabase)

  if (alertas.length === 0) return null

  const porTurma = new Map<string, { turmaNome: string; count: number }>()
  for (const a of alertas) {
    if (!porTurma.has(a.turmaId)) porTurma.set(a.turmaId, { turmaNome: a.turmaNome, count: 0 })
    porTurma.get(a.turmaId)!.count++
  }
  const turmasComAlerta = [...porTurma.entries()]
    .map(([turmaId, v]) => ({ turmaId, ...v }))
    .sort((a, b) => b.count - a.count)

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-navy-500">
          Atenção: 2 faltas não justificadas seguidas
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {turmasComAlerta.map((t) => (
          <Link key={t.turmaId} href={`/presencas/alertas/${t.turmaId}`}>
            <Card className="hover:border-amber-300 transition-colors cursor-pointer border-amber-100 bg-amber-50/50">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-navy-500 truncate">{t.turmaNome}</p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                    Ver detalhes <ChevronRight size={11} />
                  </span>
                </div>
                <p className="text-xl font-extrabold text-amber-600 flex-shrink-0">{t.count}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
