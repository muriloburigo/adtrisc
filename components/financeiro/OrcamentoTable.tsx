'use client'

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { percentConsumido, progressoBarColor } from '@/lib/financeiro'
import { saveOrcamento } from '@/app/(dashboard)/financeiro/actions'

type Linha = {
  categoriaId: string
  nome: string
  orcado: number
  consumido: number
}

function OrcamentoRow({ projetoId, linha }: { projetoId: string; linha: Linha }) {
  const [orcado, setOrcado] = useState(linha.orcado)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave(value: string) {
    const valor = Number(value.replace(',', '.'))
    if (!Number.isFinite(valor) || valor < 0) return
    startTransition(async () => {
      const result = await saveOrcamento(projetoId, linha.categoriaId, valor)
      if (result?.error) {
        setError(result.error)
        return
      }
      setError(null)
      setOrcado(valor)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-navy-500">{linha.nome}</p>
        <p className="text-xs text-gray-400">Consumido: <strong className="text-navy-500">{formatCurrency(linha.consumido)}</strong></p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 flex-shrink-0">Orçado (R$)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          defaultValue={orcado || ''}
          disabled={isPending}
          onBlur={(e) => handleSave(e.target.value)}
          className="w-32 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
        />
        {saved && <Check size={15} className="text-emerald-500" />}
        <span className="text-xs text-gray-400 sm:ml-auto">Saldo: <strong className={orcado - linha.consumido < 0 ? 'text-brand-red-500' : 'text-navy-500'}>{formatCurrency(orcado - linha.consumido)}</strong></span>
      </div>
      {error && <p className="text-xs text-brand-red-500 mt-1">{error}</p>}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-2">
        <div
          className={`h-full rounded-full ${progressoBarColor(linha.consumido, orcado)}`}
          style={{ width: `${percentConsumido(linha.consumido, orcado)}%` }}
        />
      </div>
    </div>
  )
}

export default function OrcamentoTable({ projetoId, linhas }: { projetoId: string; linhas: Linha[] }) {
  return (
    <div className="space-y-4">
      {linhas.map((linha) => (
        <OrcamentoRow key={linha.categoriaId} projetoId={projetoId} linha={linha} />
      ))}
    </div>
  )
}
