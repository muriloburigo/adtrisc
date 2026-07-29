'use client'

import { useRouter } from 'next/navigation'

type Coach = { id: string; full_name: string | null }

export default function CoachSelector({ coaches }: { coaches: Coach[] }) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Selecionar treinador
      </label>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) router.push(`/diario/nova?coach=${e.target.value}`)
        }}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
      >
        <option value="" disabled>Escolha um treinador...</option>
        {coaches.map((c) => (
          <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
        ))}
      </select>
    </div>
  )
}
