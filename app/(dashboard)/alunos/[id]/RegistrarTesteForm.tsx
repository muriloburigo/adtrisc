'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import { registrarTeste, type TipoTeste } from '@/app/(dashboard)/avaliacoes/actions'

const TIPOS: { value: TipoTeste; label: string; unidade: string; placeholder: string }[] = [
  { value: 'dabonneville', label: "Corrida — Dabonneville 5'", unidade: 'Distância (m)', placeholder: 'Ex: 1350' },
  { value: 'ciclismo_2km', label: 'Ciclismo — 2 km',           unidade: 'Tempo (MM:SS)', placeholder: 'Ex: 04:05.30' },
  { value: 'natacao_50m',  label: 'Natação — 50 m',            unidade: 'Tempo (MM:SS)', placeholder: 'Ex: 00:42.50' },
  { value: 'natacao_100m', label: 'Natação — 100 m',           unidade: 'Tempo (MM:SS)', placeholder: 'Ex: 01:35.00' },
]

export default function RegistrarTesteForm({ alunoId }: { alunoId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoTeste>('dabonneville')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const atual = TIPOS.find((t) => t.value === tipo)!

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await registrarTeste(
        alunoId,
        fd.get('data') as string,
        tipo,
        fd.get('valor') as string,
        (fd.get('atividade_url') as string) || undefined,
      )
      if (res?.error) { setError(res.error); return }
      setAberto(false)
      router.refresh()
    })
  }

  if (!aberto) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setAberto(true)}>
        <Plus size={14} /> Registrar teste
      </Button>
    )
  }

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'

  return (
    <form onSubmit={handleSubmit} className="w-full mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Teste</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoTeste)} className={inputClass}>
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Data</label>
          <input name="data" type="date" required defaultValue={new Date().toLocaleDateString('sv-SE')} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>{atual.unidade}</label>
          <input
            key={tipo}
            name="valor"
            required
            inputMode="decimal"
            placeholder={atual.placeholder}
            {...(tipo === 'dabonneville'
              ? { type: 'number', min: 1 }
              : { type: 'text', pattern: '\\d{1,3}:[0-5]\\d(\\.\\d{1,2})?', title: 'Formato MM:SS ou MM:SS.cc' })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Link da atividade (opcional)</label>
          <input name="atividade_url" type="url" placeholder="https://…" className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Fica registrado só para este atleta, na avaliação dele desta data. Não cria avaliação para a turma.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={() => { setAberto(false); setError(null) }}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Salvando…' : 'Salvar teste'}</Button>
      </div>
    </form>
  )
}
