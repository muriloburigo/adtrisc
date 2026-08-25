'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { excluirRegistroAula } from './actions'
import { friendlyError } from '@/lib/errors'

export default function DiarioDeleteButton({ registroId }: { registroId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!confirm('Excluir este registro de aula?')) return
    setError(null)
    startTransition(async () => {
      try {
        await excluirRegistroAula(registroId)
      } catch (err) {
        setError(friendlyError(err instanceof Error ? err : String(err), 'Erro ao excluir registro.'))
        setTimeout(() => setError(null), 5000)
      }
    })
  }

  return (
    <div className="relative">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
        title="Excluir"
      >
        <Trash2 size={15} />
      </button>
      {error && (
        <p className="absolute right-0 top-full mt-1 z-10 w-56 text-xs text-red-500 bg-white border border-red-100 rounded-xl shadow-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
