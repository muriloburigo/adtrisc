import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import AlunoForm from '@/components/alunos/AlunoForm'
import { createAluno } from '../actions'

export default async function NovoAlunoPage({
  searchParams,
}: {
  searchParams: Promise<{ turma?: string }>
}) {
  const { turma: turmaPreSelecionada } = await searchParams
  const supabase = await createClient()

  const { data } = await supabase
    .from('turmas')
    .select('id, nome')
    .eq('status', 'ativa')
    .order('nome')

  const turmas = (data ?? []) as { id: string; nome: string }[]

  // Se vier com ?turma=id, injetar como valor padrão via patch na action
  const actionComTurma = turmaPreSelecionada
    ? async (fd: FormData) => {
        'use server'
        if (!fd.get('turma_id')) fd.set('turma_id', turmaPreSelecionada)
        return createAluno(fd)
      }
    : createAluno

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <PageHeader title="Novo(a) Atleta" subtitle="Preencha a ficha de inscrição completa" />
      <AlunoForm action={actionComTurma} turmas={turmas} submitLabel="Cadastrar Atleta" />
    </div>
  )
}
