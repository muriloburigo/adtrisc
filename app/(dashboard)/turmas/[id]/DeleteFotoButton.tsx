'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, AlertTriangle } from 'lucide-react'
import { deleteTurmaFoto } from './galeria/actions'

export default function DeleteFotoButton({
  fotoId,
  storagePath,
  turmaId,
}: {
  fotoId: string
  storagePath: string
  turmaId: string
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      await deleteTurmaFoto(fotoId, storagePath, turmaId)
      setConfirm(false)
      router.refresh()
    })
  }

  if (confirm) {
    return (
      <div className="absolute inset-0 rounded-xl bg-black/70 flex flex-col items-center justify-center gap-3 p-3">
        <AlertTriangle size={18} className="text-amber-400" />
        <p className="text-xs text-white font-semibold text-center">Excluir esta foto?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirm(false)}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <X size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? '…' : 'Excluir'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
      title="Excluir foto"
    >
      <Trash2 size={12} />
    </button>
  )
}
