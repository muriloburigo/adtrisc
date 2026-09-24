'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateCategoria } from '@/app/(dashboard)/financeiro/actions'

export default function CategoriaRow({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(nome)
  const [current, setCurrent] = useState({ nome, ativo })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function saveNome() {
    const trimmed = value.trim()
    if (!trimmed || trimmed === current.nome) { setEditing(false); setValue(current.nome); return }
    startTransition(async () => {
      const result = await updateCategoria(id, { nome: trimmed })
      if (result?.error) { setError(result.error); return }
      setCurrent((c) => ({ ...c, nome: trimmed }))
      setEditing(false)
    })
  }

  function toggleAtivo() {
    startTransition(async () => {
      const result = await updateCategoria(id, { ativo: !current.ativo })
      if (result?.error) { setError(result.error); return }
      setCurrent((c) => ({ ...c, ativo: !c.ativo }))
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-5 py-3">
      {editing ? (
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveNome(); if (e.key === 'Escape') { setEditing(false); setValue(current.nome) } }}
            className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button onClick={saveNome} className="text-emerald-500 hover:text-emerald-600 p-1"><Check size={15} /></button>
          <button onClick={() => { setEditing(false); setValue(current.nome) }} className="text-gray-400 hover:text-gray-600 p-1"><X size={15} /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm text-navy-500 hover:text-sky-500 transition-colors group min-w-0">
          <span className="truncate">{current.nome}</span>
          <Pencil size={12} className="text-gray-300 group-hover:text-sky-400 flex-shrink-0" />
        </button>
      )}

      {error && <span className="text-xs text-brand-red-500 w-full sm:w-auto">{error}</span>}

      <label className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 cursor-pointer">
        <input type="checkbox" checked={current.ativo} disabled={isPending} onChange={toggleAtivo} className="rounded border-gray-300" />
        Ativa
      </label>
    </div>
  )
}
