import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import AlunoForm from '@/components/alunos/AlunoForm'
import BackButton from '@/components/ui/BackButton'
import { updateAluno } from '../../actions'
import type { AlunoRow, ResponsavelRow } from '@/types/database'

export default async function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: turmasRaw }, { data: respsRaw }] = await Promise.all([
    supabase.from('alunos').select('*').eq('id', id).single(),
    supabase.from('turmas').select('id, nome').eq('status', 'ativa').order('nome'),
    supabase
      .from('responsaveis')
      .select('*, aluno_responsavel!inner(aluno_id)')
      .eq('aluno_responsavel.aluno_id', id),
  ])

  if (!alunoRaw) notFound()

  const aluno = alunoRaw as AlunoRow
  const turmas = (turmasRaw ?? []) as { id: string; nome: string }[]
  const resps = (respsRaw ?? []) as ResponsavelRow[]
  const mae = resps.find((r) => r.parentesco === 'mae')
  const pai = resps.find((r) => r.parentesco === 'pai')
  const action = updateAluno.bind(null, id)

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <BackButton />
      <PageHeader title="Editar Atleta" subtitle={aluno.nome} />
      <AlunoForm action={action} aluno={aluno} turmas={turmas} mae={mae} pai={pai} submitLabel="Salvar alterações" />
    </div>
  )
}
