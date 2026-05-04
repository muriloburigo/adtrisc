import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

type PlanRow = {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  status: string
}

export default async function TreinosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('training_plans')
    .select('id, title, description, start_date, end_date, status')
    .order('created_at', { ascending: false })

  const plans = (data ?? []) as unknown as PlanRow[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planos de Treino</h1>
          <p className="text-gray-500 text-sm mt-1">{plans.length} planos cadastrados</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{plan.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                plan.status === 'ativo' ? 'bg-green-100 text-green-700' :
                plan.status === 'concluido' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {plan.status}
              </span>
            </div>
            {plan.description && (
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            )}
            <div className="mt-3 text-xs text-gray-400 space-y-1">
              <p>Início: {formatDate(plan.start_date)}</p>
              {plan.end_date && <p>Fim: {formatDate(plan.end_date)}</p>}
            </div>
          </div>
        ))}
        {!plans.length && (
          <div className="col-span-2 text-center py-12 text-gray-400">
            Nenhum plano de treino cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  )
}
