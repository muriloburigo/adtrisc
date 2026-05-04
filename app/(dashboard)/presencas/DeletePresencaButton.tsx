'use client'

import { useState, useTransition } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deletePresencas } from './actions'

interface Props {
  turmaId: string
  data: string
  turmaNome: string
  onSuccess?: () => void
  variant?: 'icon' | 'full'
}

export default function DeletePresencaButton({
  turmaId,
  data,
  turmaNome,
  onSuccess,
  variant = 'full',
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const result = await deletePresencas(turmaId, data, turmaNome)
        if (result?.error) {
          setError(result.error)
          setConfirming(false)
        } else {
          onSuccess?.()
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erro ao excluir')
        setConfirming(false)
      }
    })
  }

  if (variant === 'icon') {
    if (confirming) {
      return (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-600 font-semibold hover:text-red-700 disabled:opacity-50"
          >
            {isPending ? 'Excluindo…' : 'Confirmar'}
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </span>
      )
    }
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
        title="Excluir lista"
      >
        <Trash2 size={14} />
      </button>
    )
  }

  // variant === 'full'
  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
      {confirming ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Excluir todos os registros desta sessão?</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isPending ? 'Excluindo…' : 'Sim, excluir'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
          Excluir lista
        </button>
      )}
    </div>
  )
}
