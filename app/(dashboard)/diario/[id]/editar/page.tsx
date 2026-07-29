import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import DiarioAulaForm from '../../DiarioAulaForm'

export const dynamic = 'force-dynamic'

export default async function EditarDiarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: registro }, { data: turmaEntries }] = await Promise.all([
    supabase.from('registros_aula').select('*').eq('id', id).single(),
    supabase.from('registro_aula_turmas').select('turma_id, descricao').eq('registro_aula_id', id),
  ])

  if (!registro) notFound()

  // Load coach turmas (the coach who owns this registro)
  const { data: turmasRaw } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('coach_id', registro.coach_id)
    .eq('status', 'ativa')
    .order('nome')

  const turmas = (turmasRaw ?? []) as { id: string; nome: string }[]

  const defaultValues = {
    data:        registro.data,
    modalidade:  registro.modalidade,
    objetivo:    registro.objetivo   ?? '',
    observacoes: registro.observacoes ?? '',
    turmas: (turmaEntries ?? []) as Array<{ turma_id: string; descricao: string | null }>,
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/diario" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-navy-500">Editar Registro</h1>
          <p className="text-sm text-gray-400 mt-0.5">{registro.data.split('-').reverse().join('/')}</p>
        </div>
      </div>

      <Card>
        <DiarioAulaForm turmas={turmas} registroId={id} defaultValues={defaultValues} />
      </Card>
    </div>
  )
}
