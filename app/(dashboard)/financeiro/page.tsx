import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge, { statusPagamentoVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { CreditCard, Plus } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pagamentos')
    .select('id, valor, vencimento, pago_em, status, descricao, mes_referencia, alunos:aluno_id ( nome )')
    .order('vencimento', { ascending: false })

  type PgtoRow = {
    id: string; valor: number; vencimento: string; pago_em: string | null
    status: string; descricao: string | null; mes_referencia: string | null
    alunos: { nome: string } | null
  }
  const pagamentos = (data ?? []) as unknown as PgtoRow[]

  const totalPago = pagamentos.filter((p) => p.status === 'pago').reduce((a, p) => a + p.valor, 0)
  const totalPendente = pagamentos.filter((p) => p.status === 'pendente').reduce((a, p) => a + p.valor, 0)
  const totalAtrasado = pagamentos.filter((p) => p.status === 'atrasado').reduce((a, p) => a + p.valor, 0)

  return (
    <div className="p-8">
      <PageHeader
        title="Financeiro"
        subtitle="Gestão de mensalidades e pagamentos"
        action={
          <Link href="/financeiro/novo">
            <Button><Plus size={16} />Novo Lançamento</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Recebido', value: totalPago, color: 'text-green-600' },
          { label: 'Pendente', value: totalPendente, color: 'text-yellow-600' },
          { label: 'Atrasado', value: totalAtrasado, color: 'text-brand-red-500' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{formatCurrency(value)}</p>
          </Card>
        ))}
      </div>

      <Card padding={false}>
        {pagamentos.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum pagamento registrado" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Aluno</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Vencimento</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagamentos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5 font-medium text-navy-500">{p.alunos?.nome ?? '—'}</td>
                  <td className="px-6 py-3.5 text-gray-500">{p.descricao ?? p.mes_referencia ?? '—'}</td>
                  <td className="px-6 py-3.5 font-medium">{formatCurrency(p.valor)}</td>
                  <td className="px-6 py-3.5 text-gray-500">{formatDate(p.vencimento)}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={statusPagamentoVariant(p.status)}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
