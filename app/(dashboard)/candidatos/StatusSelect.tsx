'use client'

import { useTransition } from 'react'
import { updateCandidatoStatus } from './actions'
import type { CandidatoStatus } from '@/types/database'

const STATUS_OPTIONS: { value: CandidatoStatus; label: string; color: string }[] = [
  { value: 'pendente',      label: 'Pendente',       color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'sorteado',      label: 'Sorteado(a)',     color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'nao_sorteado',  label: 'Não sorteado(a)', color: 'bg-gray-100 text-gray-600 border-gray-300' },
  { value: 'convertido',    label: 'Convertido(a)',   color: 'bg-blue-100 text-blue-700 border-blue-300' },
]

export function StatusBadge({ status }: { status: CandidatoStatus }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${opt.color}`}>
      {opt.label}
    </span>
  )
}

export default function StatusSelect({
  candidatoId,
  currentStatus,
}: {
  candidatoId: string
  currentStatus: CandidatoStatus
}) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as CandidatoStatus
    startTransition(async () => {
      await updateCandidatoStatus(candidatoId, next)
    })
  }

  const opt = STATUS_OPTIONS.find((o) => o.value === currentStatus)

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className={`text-xs font-semibold border rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60 ${opt?.color ?? ''}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
