import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/assert'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Wallet, Plus } from 'lucide-react'
import FinanceiroTabs from '../FinanceiroTabs'
import type { ProjetoFinanceiroRow } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ProjetosFinanceirosPage() {
  await requireAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: projetosRaw } = await supabase
    .from('projetos_financeiros').select('*').order('ano', { ascending: false }).order('nome')
  const projetos = (projetosRaw ?? []) as ProjetoFinanceiroRow[]

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        title="Financeiro"
        subtitle="Projetos e orçamentos"
        action={
          <Link href="/financeiro/projetos/novo">
            <Button><Plus size={16} /> Novo projeto</Button>
          </Link>
        }
      />

      <FinanceiroTabs isAdmin />

      <Card padding={false}>
        {projetos.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhum projeto cadastrado" description="Cadastre o primeiro projeto para começar a definir orçamentos." />
        ) : (
          <div className="divide-y divide-gray-100">
            {projetos.map((p) => (
              <Link
                key={p.id}
                href={`/financeiro/projetos/${p.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy-500 truncate">{p.nome}</p>
                    {!p.ativo && <Badge variant="gray">Inativo</Badge>}
                  </div>
                  {p.descricao && <p className="text-xs text-gray-400 mt-1 truncate">{p.descricao}</p>}
                </div>
                <Badge variant="sky">{p.ano}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
