'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteUser } from './actions'

export default function DeleteUserButton({ userId, nome }: { userId: string; nome: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleDelete() {
    setError('')
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <span className="text-xs text-gray-500 hidden sm:inline">Confirmar exclusão de <strong>{nome}</strong>?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          {isPending ? 'Excluindo...' : 'Confirmar'}
        </button>
        <button
          onClick={() => { setConfirming(false); setError('') }}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
      title="Excluir usuário"
    >
      <Trash2 size={13} />
      <span className="hidden sm:inline">Excluir</span>
    </button>
  )
}
