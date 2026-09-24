import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import LancamentoForm from '@/components/financeiro/LancamentoForm'
import { createLancamento } from '../../actions'

export default async function NovaNotaFiscalPage() {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const [{ data: projetosRaw }, { data: categoriasRaw }, coachesResult] = await Promise.all([
    supabase.from('projetos_financeiros').select('id, nome, ano').eq('ativo', true).order('ano', { ascending: false }).order('nome'),
    supabase.from('categorias_financeiras').select('id, nome').eq('ativo', true).order('nome'),
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
      <PageHeader title="Nova nota fiscal" subtitle="Registre uma despesa contra o orçamento de um projeto" />
      <Card>
        <LancamentoForm action={createLancamento} projetos={projetos} categorias={categorias} coaches={coaches} />
      </Card>
    </div>
  )
}
