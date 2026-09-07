'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { ETAPA_MODALIDADE_OPTIONS } from '@/lib/provas'
import type { EtapaModalidade, EtapaProva } from '@/types/database'

type EtapaState = { modalidade: EtapaModalidade; distancia_metros: string }

export default function CategoriaFormInline({
  action,
  initial,
  submitLabel = 'Salvar',
  onCancel,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  initial?: { nome: string; idade_min: number | null; idade_max: number | null; etapas: EtapaProva[] }
  submitLabel?: string
  onCancel?: () => void
  onSuccess?: () => void
}) {
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [idadeMin, setIdadeMin] = useState(initial?.idade_min?.toString() ?? '')
  const [idadeMax, setIdadeMax] = useState(initial?.idade_max?.toString() ?? '')
  const [etapas, setEtapas] = useState<EtapaState[]>(
    initial?.etapas && initial.etapas.length > 0
      ? initial.etapas.map((e) => ({ modalidade: e.modalidade, distancia_metros: String(e.distancia_metros) }))
      : [{ modalidade: 'corrida', distancia_metros: '' }],
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateEtapa(i: number, patch: Partial<EtapaState>) {
    setEtapas((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('nome', nome.trim())
    fd.set('idade_min', idadeMin)
    fd.set('idade_max', idadeMax)
    fd.set(
      'etapas_json',
      JSON.stringify(
        etapas
          .filter((et) => et.distancia_metros)
          .map((et) => ({ modalidade: et.modalidade, distancia_metros: Number(et.distancia_metros) })),
      ),
    )
    startTransition(async () => {
      const res = await action(fd)
      if (res?.error) setError(res.error)
      else onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="Categoria" placeholder="Ex: 8/9 anos" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input label="Idade mínima" type="number" min="0" value={idadeMin} onChange={(e) => setIdadeMin(e.target.value)} />
        <Input label="Idade máxima" type="number" min="0" value={idadeMax} onChange={(e) => setIdadeMax(e.target.value)} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Etapas (na ordem de disputa)</p>
        {etapas.map((etapa, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
            <Select
              className="w-40"
              options={ETAPA_MODALIDADE_OPTIONS}
              value={etapa.modalidade}
              onChange={(e) => updateEtapa(i, { modalidade: e.target.value as EtapaModalidade })}
            />
            <Input
              className="w-32"
              type="number"
              min="0"
              placeholder="Distância"
              value={etapa.distancia_metros}
              onChange={(e) => updateEtapa(i, { distancia_metros: e.target.value })}
            />
            <span className="text-xs text-gray-400">metros</span>
            {etapas.length > 1 && (
              <button
                type="button"
                onClick={() => setEtapas((prev) => prev.filter((_, j) => j !== i))}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEtapas((prev) => [...prev, { modalidade: 'corrida', distancia_metros: '' }])}
          className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium"
        >
          <Plus size={13} /> Adicionar etapa
        </button>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? 'Salvando…' : submitLabel}</Button>
        {onCancel && (
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
