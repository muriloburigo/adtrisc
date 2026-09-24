import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import LancamentoForm from '@/components/financeiro/LancamentoForm'
import { updateLancamento } from '../../../actions'

export default async function EditarNotaFiscalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const { data: lancamento } = await supabase.from('lancamentos_financeiros').select('*').eq('id', id).single()
  if (!lancamento) notFound()
  if (!isAdmin && lancamento.coach_id !== actor.id) notFound()

  const [{ data: projetosRaw }, { data: categoriasRaw }, coachesResult] = await Promise.all([
    supabase.from('projetos_financeiros').select('id, nome, ano').order('ano', { ascending: false }).order('nome'),
    supabase.from('categorias_financeiras').select('id, nome').order('nome'),
    isAdmin
      ? supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name')
      : Promise.resolve({ data: [] }),
  ])

  const projetos = (projetosRaw ?? []).map((p: { id: string; nome: string; ano: number }) => ({ value: p.id, label: `${p.nome} (${p.ano})` }))
  const categorias = (categoriasRaw ?? []).map((c: { id: string; nome: string }) => ({ value: c.id, label: c.nome }))
  const coaches = isAdmin
    ? (coachesResult.data ?? []).map((c: { id: string; full_name: string | null }) => ({ value: c.id, label: c.full_name ?? c.id }))
    : undefined

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Editar nota fiscal" />
      <Card>
        <LancamentoForm
          action={updateLancamento.bind(null, id)}
          projetos={projetos}
          categorias={categorias}
          coaches={coaches}
          arquivoAtual={lancamento.nome_arquivo}
          initial={{
            projeto_id: lancamento.projeto_id,
            categoria_id: lancamento.categoria_id,
            valor: String(lancamento.valor),
            descricao: lancamento.descricao,
            numero_nota: lancamento.numero_nota ?? '',
            data: lancamento.data,
            coach_id: lancamento.coach_id,
          }}
        />
      </Card>
    </div>
  )
}
