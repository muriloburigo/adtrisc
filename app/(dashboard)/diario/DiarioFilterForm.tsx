'use client'

import { useRouter } from 'next/navigation'

const MESES = [
  { value: 1,  label: 'Janeiro' },  { value: 2,  label: 'Fevereiro' },
  { value: 3,  label: 'Março' },    { value: 4,  label: 'Abril' },
  { value: 5,  label: 'Maio' },     { value: 6,  label: 'Junho' },
  { value: 7,  label: 'Julho' },    { value: 8,  label: 'Agosto' },
  { value: 9,  label: 'Setembro' }, { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
]
const now = new Date()
const ANOS = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

type Coach = { id: string; full_name: string | null }

export default function DiarioFilterForm({
  mes, ano, isAdmin, coaches, selectedCoach,
}: {
  mes: number; ano: number; isAdmin: boolean
  coaches: Coach[]; selectedCoach: string | null
}) {
  const router = useRouter()

  function pushUrl(newMes: number, newAno: number, newCoach: string | null) {
    const p = new URLSearchParams()
    p.set('mes', String(newMes))
    p.set('ano', String(newAno))
    if (newCoach) p.set('coach', newCoach)
    router.push(`/diario?${p}`)
  }

  const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls  = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'

  return (
    <div className="flex gap-3 flex-wrap items-end">
      <div>
        <label className={labelCls}>Mês</label>
        <select value={mes} onChange={(e) => pushUrl(Number(e.target.value), ano, selectedCoach)} className={selectCls}>
          {MESES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Ano</label>
        <select value={ano} onChange={(e) => pushUrl(mes, Number(e.target.value), selectedCoach)} className={selectCls}>
          {ANOS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {isAdmin && (
        <div className="flex-1 min-w-48">
          <label className={labelCls}>Treinador</label>
          <select
            value={selectedCoach ?? ''}
            onChange={(e) => pushUrl(mes, ano, e.target.value || null)}
            className={`${selectCls} w-full`}
          >
            <option value="">Selecione o treinador...</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>{c.full_name ?? c.id}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
