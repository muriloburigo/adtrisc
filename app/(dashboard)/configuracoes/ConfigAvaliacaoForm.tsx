'use client'

import { useState, useTransition } from 'react'
import Button from '@/components/ui/Button'
import { updateConfigAvaliacao } from './actions'
import { NOMES_ZONA } from '@/lib/zonas'
import { secondsToMmss } from '@/lib/utils'
import type { ConfigAvaliacao } from '@/lib/config-avaliacao'

export default function ConfigAvaliacaoForm({ config }: { config: ConfigAvaliacao }) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setMsg(null)
    startTransition(async () => {
      const res = await updateConfigAvaliacao(fd)
      setMsg(res?.error ? { tipo: 'erro', texto: res.error } : { tipo: 'ok', texto: 'Configurações salvas.' })
    })
  }

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className={labelClass}>Zonas de treino — limite superior de cada zona (% da velocidade do teste)</p>
        <div className="grid grid-cols-5 gap-2">
          {config.zona_limites.map((v, i) => (
            <div key={i}>
              <label className="block text-[11px] text-gray-400 mb-1">Z{i + 1} · {NOMES_ZONA[i]}</label>
              <input name={`z${i + 1}`} type="number" step="1" min="1" defaultValue={v} className={inputClass} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          Ex.: 65 / 75 / 85 / 95 / 120 → Z1 até 65%, Z2 de 65 a 75%, … Z5 de 95 a 120%. Vale para corrida (Dabonneville) e ciclismo (2 km).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Altura padrão do banco (cm)</label>
          <input name="altura_banco_padrao" type="number" step="0.1" min="0" defaultValue={config.altura_banco_padrao} className={inputClass} />
          <p className="text-xs text-gray-400 mt-1">Sugerida nas novas avaliações; descontada da estatura sentado na maturação.</p>
        </div>
        <div>
          <label className={labelClass}>Corte da natação 100 m para a equipe</label>
          <input
            name="natacao_100m_corte"
            type="text"
            inputMode="decimal"
            placeholder="MM:SS — ex.: 01:30"
            defaultValue={config.natacao_100m_corte_s != null ? secondsToMmss(config.natacao_100m_corte_s) : ''}
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">Quem nadar igual ou abaixo ganha o selo &quot;Apto para a equipe&quot;. Vazio = sem selo.</p>
        </div>
      </div>

      {msg && <p className={`text-sm ${msg.tipo === 'erro' ? 'text-red-500' : 'text-emerald-600'}`}>{msg.texto}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}
