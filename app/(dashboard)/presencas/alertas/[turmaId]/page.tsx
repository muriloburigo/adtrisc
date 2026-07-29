import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/ui/BackButton'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getAlertasFaltas } from '@/lib/faltasAlerta'

export const dynamic = 'force-dynamic'

export default async function AlertasFaltasTurmaPage({
  params,
}: {
  params: Promise<{ turmaId: string }>
}) {
  const { turmaId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: turmaRaw } = await supabase.from('turmas').select('id, nome').eq('id', turmaId).single()
  if (!turmaRaw) notFound()

  const alertas = await getAlertasFaltas(supabase, { turmaId })

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader
        title="Faltas não justificadas seguidas"
        subtitle={turmaRaw.nome}
      />

      {alertas.length === 0 ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Nenhum alerta nesta turma" />
        </Card>
      ) : (
        <div className="space-y-2">
          {alertas.map((a) => (
            <Link key={a.alunoId} href={`/alunos/${a.alunoId}`}>
              <Card className="hover:border-amber-300 transition-colors cursor-pointer border-amber-100 bg-amber-50/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-500 truncate">{a.nome}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-amber-600">
                      {a.ultimasFaltas.map((d) => formatDate(d)).reverse().join(' · ')}
                    </p>
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                      Ver atleta <ChevronRight size={11} />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
