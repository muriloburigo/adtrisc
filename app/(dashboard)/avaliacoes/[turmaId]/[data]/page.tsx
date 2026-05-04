import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import { ChevronLeft, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CriterioPanel from './CriterioPanel'
import type { AlunoRow, TurmaRow, AvaliacaoFisicaRow } from '@/types/database'

type AlunoBasic = Pick<AlunoRow, 'id' | 'nome'>

export default async function AvaliacaoCampoPage({
  params,
}: {
  params: Promise<{ turmaId: string; data: string }>
}) {
  const { turmaId, data } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: avaliacoesRaw }] = await Promise.all([
    supabase.from('turmas').select('id, nome, modalidade').eq('id', turmaId).single(),
    supabase.from('alunos').select('id, nome').eq('turma_id', turmaId).eq('status', 'ativo').order('nome'),
    supabase.from('avaliacoes_fisicas')
      .select('*')
      .in(
        'aluno_id',
        // sub-select so we don't fail on empty turma
        (await supabase.from('alunos').select('id').eq('turma_id', turmaId).eq('status', 'ativo'))
          .data?.map((a: { id: string }) => a.id) ?? [],
      )
      .eq('data', data),
  ])

  if (!turmaRaw) notFound()

  const turma  = turmaRaw as Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>
  const alunos = (alunosRaw ?? []) as AlunoBasic[]

  // Build lookup: alunoId → avaliação
  const avaliacaoMap: Record<string, Partial<AvaliacaoFisicaRow>> = {}
  for (const av of (avaliacoesRaw ?? []) as AvaliacaoFisicaRow[]) {
    avaliacaoMap[av.aluno_id] = av
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header compacto */}
      <div className="px-6 pt-6 pb-3 border-b border-gray-100">
        <Link
          href="/avaliacoes"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 transition-colors mb-2"
        >
          <ChevronLeft size={13} /> Avaliações
        </Link>
        <PageHeader
          title={turma.nome}
          subtitle={
            <span className="flex items-center gap-1.5">
              <Calendar size={13} /> {formatDate(data)}
              <span className="text-gray-300">·</span>
              <span>{alunos.length} atleta{alunos.length !== 1 ? 's' : ''}</span>
            </span>
          }
        />
      </div>

      <CriterioPanel
        turmaId={turmaId}
        data={data}
        alunos={alunos}
        avaliacaoMap={avaliacaoMap}
      />
    </div>
  )
}
