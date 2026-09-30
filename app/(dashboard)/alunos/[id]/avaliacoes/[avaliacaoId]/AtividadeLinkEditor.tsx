'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { saveAtividadeUrl } from '@/app/(dashboard)/avaliacoes/actions'

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400'

export default function AtividadeLinkEditor({
  alunoId,
  data,
  url,
}: {
  alunoId: string
  data: string
  url: string | null
}) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const valor = (new FormData(e.currentTarget).get('atividade_url') as string) ?? ''
    setError(null)
    startTransition(async () => {
      const res = await saveAtividadeUrl(alunoId, data, valor)
      if (res?.error) { setError(res.error); return }
      setEditando(false)
      router.refresh()
    })
  }

  if (!editando) {
    return (
      <div className="mt-4 flex items-center gap-3 text-sm">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
            Ver atividade do teste ↗
          </a>
        )}
        <button type="button" onClick={() => setEditando(true)} className="text-gray-400 hover:text-navy-500">
          {url ? 'Editar link' : '+ Adicionar link da atividade'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <label className="block text-xs text-gray-400">Link da atividade (Garmin, Polar, Strava)</label>
      <input name="atividade_url" type="url" defaultValue={url ?? ''} placeholder="https://…" autoFocus className={inputClass} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={() => { setEditando(false); setError(null) }}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}
