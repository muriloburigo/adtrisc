'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createCategoria } from '@/app/(dashboard)/financeiro/actions'

export default function NovaCategoriaForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    startTransition(async () => {
      const result = await createCategoria(fd)
      if (result?.error) { setError(result.error); return }
      setError(null)
      formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex items-start gap-2 mb-6">
      <div className="flex-1">
        <input
          name="nome"
          placeholder="Nova categoria, ex: Viagens"
          required
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        {error && <p className="text-xs text-brand-red-500 mt-1">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-navy-500 text-white rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-50"
      >
        <Plus size={15} /> Adicionar
      </button>
    </form>
  )
}
