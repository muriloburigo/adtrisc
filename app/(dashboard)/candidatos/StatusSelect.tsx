'use client'

import { useTransition } from 'react'
import { updateCandidatoStatus } from './actions'

const STATUS_OPTIONS = [
  { value: 'pendente',     label: 'Pendente',      color: 'bg-gray-100 text-gray-700' },
  { value: 'sorteado',     label: 'Sorteado',      color: 'bg-emerald-100 text-emerald-700' },
  { value: 'nao_sorteado', label: 'Não sorteado',  color: 'bg-amber-100 text-amber-700' },
  { value: 'convertido',   label: 'Convertido',    color: 'bg-sky-100 text-sky-700' },
]

export default function StatusSelect({
  candidatoId,
  currentStatus,
}: {
  candidatoId: string
  currentStatus: string
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value
    startTransition(() => { updateCandidatoStatus(candidatoId, status) })
  }

  const current = STATUS_OPTIONS.find((s) => s.value === currentStatus)

  return (
    <div className="relative">
      <select
        defaultValue={currentStatus}
        onChange={handleChange}
        disabled={pending}
        className={`
          appearance-none cursor-pointer border rounded-lg px-3 py-2 pr-8
          text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400
          disabled:opacity-60 transition-colors
          ${current?.color ?? 'bg-gray-100 text-gray-700'}
        `}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-60 text-[10px]">▼</span>
    </div>
  )
}
