'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteFotoTurma } from './galeria/actions'

export default function DeleteFotoButton({
  fotoId,
  storagePath,
  turmaId,
}: {
  fotoId: string
  storagePath: string
  turmaId: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('Excluir esta foto?')) return
        startTransition(() => deleteFotoTurma(fotoId, storagePath, turmaId))
      }}
      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
      title="Excluir foto"
    >
      <Trash2 size={12} />
    </button>
  )
}
