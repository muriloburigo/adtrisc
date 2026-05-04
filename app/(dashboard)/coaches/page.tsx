import { createClient } from '@/lib/supabase/server'

type CoachRow = {
  id: string
  full_name: string | null
  email: string
}

export default async function CoachesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'coach')
    .order('full_name')

  const coaches = (data ?? []) as unknown as CoachRow[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coaches</h1>
          <p className="text-gray-500 text-sm mt-1">{coaches.length} coaches cadastrados</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Coach
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.map((coach) => (
          <div key={coach.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                {coach.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{coach.full_name ?? '—'}</p>
                <p className="text-xs text-gray-400">{coach.email}</p>
              </div>
            </div>
          </div>
        ))}
        {!coaches.length && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            Nenhum coach cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  )
}
