import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import BackButton from '@/components/ui/BackButton'
import ProjetoForm from '@/components/financeiro/ProjetoForm'
import OrcamentoTable from '@/components/financeiro/OrcamentoTable'
import ProjetoArquivosSection from '@/components/financeiro/ProjetoArquivosSection'
import type { ProjetoArquivoItem } from '@/components/financeiro/ProjetoArquivosSection'
import ProjetoDeleteButton from './ProjetoDeleteButton'
import { updateProjeto } from '../../actions'
import type { CategoriaFinanceiraRow, ProjetoArquivoRow } from '@/types/database'

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: projeto } = await supabase.from('projetos_financeiros').select('*').eq('id', id).single()
  if (!projeto) notFound()

  const [{ data: categoriasRaw }, { data: orcamentosRaw }, { data: lancamentosRaw }, { data: arquivosRaw }] = await Promise.all([
    supabase.from('categorias_financeiras').select('*').eq('ativo', true).order('nome'),
    supabase.from('orcamentos_financeiros').select('*').eq('projeto_id', id),
    supabase.from('lancamentos_financeiros').select('categoria_id, valor').eq('projeto_id', id),
    supabase.from('projeto_arquivos').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
  ])

  const arquivosBrutos = (arquivosRaw ?? []) as ProjetoArquivoRow[]
  const admin = createAdminClient()
  const arquivos: ProjetoArquivoItem[] = await Promise.all(
    arquivosBrutos.map(async (a) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: signed } = await (admin as any).storage.from('financeiro-arquivos').createSignedUrl(a.storage_path, 3600)
      return {
        id: a.id,
        nomeArquivo: a.nome_arquivo,
        storagePath: a.storage_path,
        createdAt: a.created_at,
        signedUrl: signed?.signedUrl ?? null,
      }
    }),
  )

  const categorias = (categoriasRaw ?? []) as CategoriaFinanceiraRow[]
  const orcadoMap = new Map<string, number>((orcamentosRaw ?? []).map((o: { categoria_id: string; valor_orcado: number }) => [o.categoria_id, Number(o.valor_orcado)]))
  const consumidoMap = new Map<string, number>()
  for (const l of lancamentosRaw ?? []) {
    consumidoMap.set(l.categoria_id, (consumidoMap.get(l.categoria_id) ?? 0) + Number(l.valor))
  }

  const linhas = categorias.map((c) => ({
    categoriaId: c.id,
    nome: c.nome,
    orcado: orcadoMap.get(c.id) ?? 0,
    consumido: consumidoMap.get(c.id) ?? 0,
  }))

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title={projeto.nome} subtitle={`Competência ${projeto.ano}`} />

      <Card className="mb-6">
        <ProjetoForm
          action={updateProjeto.bind(null, id)}
          initial={{
            nome: projeto.nome, ano: String(projeto.ano), descricao: projeto.descricao ?? '',
            objetivo: projeto.objetivo ?? '', metas: projeto.metas ?? '', ativo: projeto.ativo,
          }}
        />
      </Card>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-navy-500">Orçamento por categoria</p>
      </div>
      <Card className="mb-6">
        {categorias.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma categoria cadastrada ainda. Crie categorias em Financeiro → Categorias.</p>
        ) : (
          <OrcamentoTable projetoId={id} linhas={linhas} />
        )}
      </Card>

      <Card>
        <ProjetoArquivosSection projetoId={id} arquivos={arquivos} />
      </Card>

      <div className="flex justify-end mt-6">
        <ProjetoDeleteButton id={id} />
      </div>
    </div>
  )
}
