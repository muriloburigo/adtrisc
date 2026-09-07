'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'

export default function ConfirmDeleteButton({
  action,
  confirmLabel = 'Excluir?',
  title = 'Excluir',
  onSuccess,
  size = 14,
  variant = 'icon',
  label = 'Excluir',
}: {
  action: () => Promise<{ error?: string } | void>
  confirmLabel?: string
  title?: string
  onSuccess?: () => void
  size?: number
  variant?: 'icon' | 'full'
  label?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      } else {
        setConfirming(false)
        onSuccess?.()
      }
    })
  }

  if (confirming) {
    return (
      <span className="inline-flex flex-col items-end gap-0.5">
        {error && <span className="text-xs text-red-500 whitespace-nowrap">{error}</span>}
        <span className="inline-flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-600 font-semibold hover:text-red-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isPending ? 'Excluindo…' : confirmLabel}
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </span>
      </span>
    )
  }

  if (variant === 'full') {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
      >
        <Trash2 size={size} />
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded cursor-pointer"
      title={title}
    >
      <Trash2 size={size} />
    </button>
  )
}
