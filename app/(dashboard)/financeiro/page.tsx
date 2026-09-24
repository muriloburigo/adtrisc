import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { Wallet, Settings } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { percentConsumido, progressoBarColor } from '@/lib/financeiro'
import FinanceiroTabs from './FinanceiroTabs'
import AnoSelector from './AnoSelector'
import type { ProjetoFinanceiroRow, CategoriaFinanceiraRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage({
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

  const { data: projetosRaw } = await supabase
    .from('projetos_financeiros').select('*').order('ano', { ascending: false }).order('nome')
  const projetos = (projetosRaw ?? []) as ProjetoFinanceiroRow[]

  const anosDisponiveis = [...new Set(projetos.map((p) => p.ano))].sort((a, b) => b - a)
  const anoAtual = new Date().getFullYear()
  const ano = Number(sp.ano) || anosDisponiveis[0] || anoAtual

  const projetosDoAno = projetos.filter((p) => p.ano === ano && p.ativo)
  const projetoIds = projetosDoAno.map((p) => p.id)

  const [{ data: categoriasRaw }, { data: orcamentosRaw }, { data: lancamentosRaw }] = await Promise.all([
    supabase.from('categorias_financeiras').select('*').order('nome'),
    projetoIds.length
      ? supabase.from('orcamentos_financeiros').select('*').in('projeto_id', projetoIds)
      : Promise.resolve({ data: [] }),
    projetoIds.length
      ? supabase.from('lancamentos_financeiros').select('projeto_id, categoria_id, valor').in('projeto_id', projetoIds)
      : Promise.resolve({ data: [] }),
  ])

  const categorias = (categoriasRaw ?? []) as CategoriaFinanceiraRow[]
  const categoriaNome = new Map(categorias.map((c) => [c.id, c.nome]))

  const orcadoMap = new Map<string, number>() // `${projetoId}:${categoriaId}` -> valor
  for (const o of orcamentosRaw ?? []) {
    orcadoMap.set(`${o.projeto_id}:${o.categoria_id}`, Number(o.valor_orcado))
  }
  const consumidoMap = new Map<string, number>()
  for (const l of lancamentosRaw ?? []) {
    const key = `${l.projeto_id}:${l.categoria_id}`
    consumidoMap.set(key, (consumidoMap.get(key) ?? 0) + Number(l.valor))
  }

  const anoOptions = (anosDisponiveis.length ? anosDisponiveis : [anoAtual]).map((a) => ({ value: String(a), label: String(a) }))

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        title="Financeiro"
        subtitle="Orçamento e notas fiscais por projeto"
        action={isAdmin ? (
          <Link href="/financeiro/projetos" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-sky-500 transition-colors">
            <Settings size={15} /> Gerenciar projetos
          </Link>
        ) : undefined}
      />

      <FinanceiroTabs isAdmin={isAdmin} />

      <div className="mb-6 max-w-xs">
        <AnoSelector ano={ano} options={anoOptions} />
      </div>

      {projetosDoAno.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            icon={Wallet}
            title="Nenhum projeto neste ano"
            description={isAdmin ? 'Cadastre um projeto para começar a controlar o orçamento.' : 'Nenhum projeto financeiro ativo foi cadastrado para este ano.'}
            action={isAdmin ? (
              <Link href="/financeiro/projetos/novo" className="text-sm font-medium text-sky-500 hover:text-sky-600">
                Novo projeto
              </Link>
            ) : undefined}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {projetosDoAno.map((projeto) => {
            const categoriaIds = new Set<string>()
            for (const key of orcadoMap.keys()) {
              const [pid, cid] = key.split(':')
              if (pid === projeto.id) categoriaIds.add(cid)
            }
            for (const key of consumidoMap.keys()) {
              const [pid, cid] = key.split(':')
              if (pid === projeto.id) categoriaIds.add(cid)
            }

            let totalOrcado = 0
            let totalConsumido = 0
            const linhas = [...categoriaIds].map((cid) => {
              const orcado = orcadoMap.get(`${projeto.id}:${cid}`) ?? 0
              const consumido = consumidoMap.get(`${projeto.id}:${cid}`) ?? 0
              totalOrcado += orcado
              totalConsumido += consumido
              return { categoriaId: cid, nome: categoriaNome.get(cid) ?? 'Categoria', orcado, consumido }
            }).sort((a, b) => a.nome.localeCompare(b.nome))

            return (
              <Card key={projeto.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-navy-500">{projeto.nome}</p>
                    {projeto.descricao && <p className="text-xs text-gray-400 mt-0.5">{projeto.descricao}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">Saldo</p>
                    <p className={`text-sm font-semibold ${totalOrcado - totalConsumido < 0 ? 'text-brand-red-500' : 'text-navy-500'}`}>
                      {formatCurrency(totalOrcado - totalConsumido)}
                    </p>
                  </div>
                </div>

                {linhas.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    {isAdmin ? (
                      <Link href={`/financeiro/projetos/${projeto.id}`} className="text-sky-500 hover:text-sky-600 font-medium">
                        Definir orçamento por categoria
                      </Link>
                    ) : 'Nenhuma categoria orçada ainda.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {linhas.map((linha) => (
                      <div key={linha.categoriaId}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mb-1">
                          <p className="text-sm text-navy-500 truncate">{linha.nome}</p>
                          <p className="text-xs text-gray-400 flex-shrink-0">
                            {formatCurrency(linha.consumido)} de {formatCurrency(linha.orcado)}
                          </p>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressoBarColor(linha.consumido, linha.orcado)}`}
                            style={{ width: `${percentConsumido(linha.consumido, linha.orcado)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                  <span>Orçado: <strong className="text-navy-500 font-semibold">{formatCurrency(totalOrcado)}</strong></span>
                  <span>Consumido: <strong className="text-navy-500 font-semibold">{formatCurrency(totalConsumido)}</strong></span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
