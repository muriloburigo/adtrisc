import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import AttendanceChecklist from './AttendanceChecklist'
import type { AlunoRow, TurmaRow, PresencaRow } from '@/types/database'

type AlunoBasic = Pick<AlunoRow, 'id' | 'nome' | 'status'>

export default async function PresencaChecklistPage({
  params,
}: {
  params: Promise<{ turmaId: string; data: string }>
}) {
  const { turmaId, data } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
    supabase.from('turmas').select('id, nome, modalidade').eq('id', turmaId).single(),
    supabase.from('alunos').select('id, nome, status').eq('turma_id', turmaId).in('status', ['ativo', 'inativo']).order('nome'),
    supabase.from('presencas').select('*').eq('turma_id', turmaId).eq('data', data).is('deleted_at', null),
  ])

  if (!turmaRaw) notFound()

  const turma = turmaRaw as Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>
  const alunos = (alunosRaw ?? []) as AlunoBasic[]
  const presencasExistentes = (presencasRaw ?? []) as PresencaRow[]

  const dataFormatada = formatDate(data)
  const turmaLabel = `${turma.nome} · ${dataFormatada}`
  const turmaNome = turma.nome

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />

      <PageHeader
        title={turma.nome}
        subtitle={
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {dataFormatada}
            {presencasExistentes.length > 0 && (
              <span className="ml-2 text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full font-medium">
                Já registrado
              </span>
            )}
          </span>
        }
      />

      <Card>
        <AttendanceChecklist
          turmaId={turmaId}
          data={data}
          turmaLabel={turmaLabel}
          turmaNome={turmaNome}
          alunos={alunos}
          presencasExistentes={presencasExistentes}
        />
      </Card>
    </div>
  )
}
