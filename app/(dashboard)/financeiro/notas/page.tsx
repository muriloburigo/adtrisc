import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { Receipt, Plus, Paperclip, Pencil } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import FinanceiroTabs from '../FinanceiroTabs'
import NotaDeleteButton from './NotaDeleteButton'

export const dynamic = 'force-dynamic'

export default async function NotasFiscaisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const actor = await requireStaff()
  const sp = await searchParams

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', actor.id).single()
  const isAdmin = myProfile?.role === 'admin'

  const [{ data: projetosRaw }, { data: categoriasRaw }, { data: coachesRaw }] = await Promise.all([
    supabase.from('projetos_financeiros').select('id, nome, ano').order('ano', { ascending: false }).order('nome'),
    supabase.from('categorias_financeiras').select('id, nome').order('nome'),
    isAdmin
      ? supabase.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name')
      : Promise.resolve({ data: [] }),
  ])

  const projeto = sp.projeto ?? ''
  const categoria = sp.categoria ?? ''
  const coach = sp.coach ?? ''

  let query = supabase
    .from('lancamentos_financeiros')
    .select(`
      id, valor, descricao, numero_nota, data, nome_arquivo, storage_path, coach_id,
      projeto:projetos_financeiros ( id, nome ),
      categoria:categorias_financeiras ( id, nome ),
      coach:profiles!lancamentos_financeiros_coach_id_fkey ( id, full_name )
    `)
    .order('data', { ascending: false })

  if (projeto) query = query.eq('projeto_id', projeto)
  if (categoria) query = query.eq('categoria_id', categoria)
  if (!isAdmin) query = query.eq('coach_id', actor.id)
  else if (coach) query = query.eq('coach_id', coach)

  const { data: lancamentosRaw } = await query

  type LancamentoItem = {
    id: string; valor: number; descricao: string; numero_nota: string | null; data: string
    nome_arquivo: string | null; storage_path: string | null; coach_id: string
    projeto: { id: string; nome: string } | null
    categoria: { id: string; nome: string } | null
    coach: { id: string; full_name: string | null } | null
  }
  const lancamentos = (lancamentosRaw ?? []) as unknown as LancamentoItem[]

  const admin = createAdminClient()
  const signedUrls = new Map<string, string>()
  await Promise.all(
    lancamentos
      .filter((l) => l.storage_path)
      .map(async (l) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signed } = await (admin as any).storage.from('notas-fiscais').createSignedUrl(l.storage_path, 3600)
        if (signed?.signedUrl) signedUrls.set(l.id, signed.signedUrl)
      }),
  )

  const filterFields = [
    { type: 'select' as const, key: 'projeto', placeholder: 'Todos os projetos',
      options: (projetosRaw ?? []).map((p: { id: string; nome: string; ano: number }) => ({ value: p.id, label: `${p.nome} (${p.ano})` })) },
    { type: 'select' as const, key: 'categoria', placeholder: 'Todas as categorias',
      options: (categoriasRaw ?? []).map((c: { id: string; nome: string }) => ({ value: c.id, label: c.nome })) },
    ...(isAdmin ? [{ type: 'select' as const, key: 'coach', placeholder: 'Todos os treinadores',
      options: (coachesRaw ?? []).map((c: { id: string; full_name: string | null }) => ({ value: c.id, label: c.full_name ?? c.id })) }] : []),
  ]

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        title="Financeiro"
        subtitle="Notas fiscais lançadas"
        action={
          <Link href="/financeiro/notas/nova">
            <Button><Plus size={16} /> Nova nota</Button>
          </Link>
        }
      />

      <FinanceiroTabs isAdmin={isAdmin} />

      <FilterBar fields={filterFields} initialValues={{ projeto, categoria, coach }} />

      <Card padding={false}>
        {lancamentos.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma nota fiscal encontrada"
            description={projeto || categoria || coach ? 'Tente ajustar os filtros.' : 'Lance a primeira nota fiscal para começar.'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {lancamentos.map((l) => {
              const podeEditar = isAdmin || l.coach_id === actor.id
              return (
                <div key={l.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-4 sm:px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-navy-500 truncate">{l.descricao}</p>
                      {l.numero_nota && <span className="text-xs text-gray-400">Nº {l.numero_nota}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(l.data)} · {l.projeto?.nome ?? '—'} · {l.categoria?.nome ?? '—'} · {l.coach?.full_name ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                    <p className="text-sm font-semibold text-navy-500">{formatCurrency(l.valor)}</p>
                    <div className="flex items-center gap-3">
                      {signedUrls.has(l.id) && (
                        <a href={signedUrls.get(l.id)} target="_blank" rel="noopener noreferrer"
                          className="text-gray-300 hover:text-sky-500 transition-colors" title="Ver anexo">
                          <Paperclip size={15} />
                        </a>
                      )}
                      {podeEditar && (
                        <>
                          <Link href={`/financeiro/notas/${l.id}/editar`} className="text-gray-300 hover:text-sky-500 transition-colors p-1" title="Editar">
                            <Pencil size={14} />
                          </Link>
                          <NotaDeleteButton id={l.id} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
