import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { UserPlus, ChevronRight } from 'lucide-react'

export default async function NovosCandidatosAlertSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: candidatosRaw } = await supabase
    .from('candidatos')
    .select('id')
    .eq('status', 'inscrito')

  const candidatos = (candidatosRaw ?? []) as { id: string }[]
  if (candidatos.length === 0) return null

  const href = candidatos.length === 1
    ? `/candidatos/${candidatos[0].id}`
    : '/candidatos?status=inscrito'

  return (
    <Link href={href}>
      <Card className="hover:border-sky-300 transition-colors cursor-pointer border-sky-100 bg-sky-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <UserPlus size={16} className="text-sky-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-navy-500 truncate">
                {candidatos.length === 1 ? 'Novo formulário preenchido' : 'Novos formulários preenchidos'}
              </p>
              <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                {candidatos.length === 1 ? 'Ver cadastro' : 'Ver todos'} <ChevronRight size={11} />
              </span>
            </div>
          </div>
          <p className="text-xl font-extrabold text-sky-600 flex-shrink-0">{candidatos.length}</p>
        </div>
      </Card>
    </Link>
  )
}
