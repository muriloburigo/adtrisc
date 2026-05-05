import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft } from 'lucide-react'
import AvaliacaoForm from './AvaliacaoForm'
import type { AlunoRow } from '@/types/database'

export default async function NovaAvaliacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: alunoRaw } = await supabase
    .from('alunos').select('id, nome').eq('id', id).single()

  if (!alunoRaw) notFound()
  const aluno = alunoRaw as Pick<AlunoRow, 'id' | 'nome'>

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-4">
        <Link
          href={`/alunos/${id}/avaliacoes`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-navy-500 transition-colors"
        >
          <ChevronLeft size={15} /> Voltar
        </Link>
      </div>

      <PageHeader
        title="Nova Avaliação Física"
        subtitle={aluno.nome}
      />

      <Card>
        <AvaliacaoForm alunoId={id} alunoNome={aluno.nome} />
      </Card>
    </div>
  )
}
