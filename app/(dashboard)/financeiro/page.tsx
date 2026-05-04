import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency } from '@/lib/utils'

type PaymentRow = {
  id: string
  amount: number
  due_date: string
  status: string
  description: string | null
  athletes: { profiles: { full_name: string } | null } | null
}

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('payments')
    .select('id, amount, due_date, status, description, athletes:athlete_id ( profiles:profile_id ( full_name ) )')
    .order('due_date', { ascending: false })

  const payments = (data ?? []) as unknown as PaymentRow[]

  const total = payments.reduce((acc, p) => acc + (p.status === 'pago' ? p.amount : 0), 0)
  const pending = payments.reduce((acc, p) => acc + (p.status === 'pendente' ? p.amount : 0), 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Gestão de mensalidades e pagamentos</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Recebido</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Pendente</p>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(pending)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Atleta</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Descrição</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Vencimento</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {p.athletes?.profiles?.full_name ?? '—'}
                </td>
                <td className="px-6 py-4 text-gray-500">{p.description ?? '—'}</td>
                <td className="px-6 py-4 font-medium">{formatCurrency(p.amount)}</td>
                <td className="px-6 py-4 text-gray-500">{formatDate(p.due_date)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'pago' ? 'bg-green-100 text-green-700' :
                    p.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                    p.status === 'atrasado' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  Nenhum pagamento registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
