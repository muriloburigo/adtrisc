import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import AttendanceChecklist from './AttendanceChecklist'
import type { AlunoRow, TurmaRow, PresencaRow } from '@/types/database'

type AlunoBasic = Pick<AlunoRow, 'id' | 'nome'>

export default async function PresencaChecklistPage({
  params,
  searchParams,
}: {
  params: Promise<{ turmaId: string; data: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { turmaId, data } = await params
  const { saved } = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
    supabase.from('turmas').select('id, nome, modalidade').eq('id', turmaId).single(),
    supabase.from('alunos').select('id, nome').eq('turma_id', turmaId).eq('status', 'ativo').order('nome'),
    supabase.from('presencas').select('*').eq('turma_id', turmaId).eq('data', data),
  ])

  if (!turmaRaw) notFound()

  const turma = turmaRaw as Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>
  const alunos = (alunosRaw ?? []) as AlunoBasic[]
  const presencasExistentes = (presencasRaw ?? []) as PresencaRow[]

  const dataFormatada = formatDate(data)
  const turmaLabel = `${turma.nome} · ${dataFormatada}`

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-4">
        <Link
          href="/presencas"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-navy-500 transition-colors"
        >
          <ChevronLeft size={15} /> Voltar
        </Link>
      </div>

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
          alunos={alunos}
          presencasExistentes={presencasExistentes}
          savedParam={saved === '1'}
        />
      </Card>
    </div>
  )
}
