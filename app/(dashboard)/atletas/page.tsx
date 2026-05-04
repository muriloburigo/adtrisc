import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

type AthleteRow = {
  id: string
  modality: string | null
  status: string
  created_at: string
  profiles: { full_name: string; email: string } | null
  coaches: { full_name: string } | null
}

export default async function AtletasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('athletes')
    .select(`
      id, modality, status, created_at,
      profiles:profile_id ( full_name, email ),
      coaches:coach_id ( full_name )
    `)
    .order('created_at', { ascending: false })

  const athletes = (data ?? []) as unknown as AthleteRow[]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atletas</h1>
          <p className="text-gray-500 text-sm mt-1">{athletes.length} atletas cadastrados</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Atleta
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Modalidade</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Coach</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {athletes.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{a.profiles?.full_name ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500">{a.profiles?.email ?? '—'}</td>
                <td className="px-6 py-4 text-gray-600 capitalize">{a.modality ?? '—'}</td>
                <td className="px-6 py-4 text-gray-600">{a.coaches?.full_name ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.status === 'ativo' ? 'bg-green-100 text-green-700' :
                    a.status === 'inativo' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(a.created_at)}</td>
              </tr>
            ))}
            {!athletes.length && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  Nenhum atleta cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
