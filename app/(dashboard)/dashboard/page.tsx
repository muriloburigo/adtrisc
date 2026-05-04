import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalAthletes },
    { count: activeAthletes },
    { count: pendingPayments },
  ] = await Promise.all([
    supabase.from('athletes').select('*', { count: 'exact', head: true }),
    supabase.from('athletes').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
  ])

  const stats = [
    { label: 'Total de Atletas', value: totalAthletes ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Atletas Ativos', value: activeAthletes ?? 0, color: 'bg-green-50 text-green-700' },
    { label: 'Pagamentos Pendentes', value: pendingPayments ?? 0, color: 'bg-yellow-50 text-yellow-700' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral da escolinha</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${stat.color} inline-block px-3 py-1 rounded-lg`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
