'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveAvaliacao } from '@/app/(dashboard)/avaliacoes/actions'

export default function AvaliacaoForm({
  alunoId,
  alunoNome,
}: {
  alunoId: string
  alunoNome: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [massa, setMassa] = useState('')
  const [alt, setAlt] = useState('')

  const altM = parseFloat(alt)
  const massaKg = parseFloat(massa)
  const imc = altM > 0 && massaKg > 0 ? (massaKg / (altM / 100) ** 2).toFixed(1) : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Convert estatura from cm to m
    const altCm = parseFloat(fd.get('estatura') as string)
    if (!isNaN(altCm)) fd.set('estatura', String(altCm / 100))
    fd.set('aluno_nome', alunoNome)
    startTransition(async () => {
      await saveAvaliacao(fd)
      router.push(`/alunos/${alunoId}/avaliacoes`)
    })
  }

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="aluno_id" value={alunoId} />

      <div>
        <label className={labelClass}>Data da avaliação</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Massa corporal (kg)</label>
          <input
            name="massa_corporal"
            type="number"
            step="0.1"
            min="0"
            placeholder="Ex: 45.5"
            value={massa}
            onChange={(e) => setMassa(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Estatura (cm)</label>
          <input
            name="estatura"
            type="number"
            step="0.1"
            min="0"
            placeholder="Ex: 162"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {imc && (
        <div className="bg-sky-50 rounded-xl px-4 py-3 text-sm">
          <span className="text-sky-600 font-semibold">IMC calculado: {imc}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Resistência 6 min (m)</label>
          <input
            name="resistencia_6min"
            type="number"
            min="0"
            placeholder="Distância em metros"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Força abdominal (rep)</label>
          <input
            name="forca_abdominal"
            type="number"
            min="0"
            placeholder="Repetições"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Envergadura (cm)</label>
          <input
            name="envergadura"
            type="number"
            step="0.1"
            min="0"
            placeholder="Em centímetros"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Impulsão vertical (cm)</label>
          <input
            name="impulsao_vertical"
            type="number"
            step="0.1"
            min="0"
            placeholder="Em centímetros"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Velocidade 20 m (s)</label>
          <input
            name="velocidade_20m"
            type="number"
            step="0.01"
            min="0"
            placeholder="Em segundos"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Flexibilidade (cm)</label>
          <input
            name="flexibilidade"
            type="number"
            step="0.1"
            placeholder="Em centímetros"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          placeholder="Observações adicionais…"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-sky-400 hover:bg-sky-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar avaliação'}
        </button>
      </div>
    </form>
  )
}
