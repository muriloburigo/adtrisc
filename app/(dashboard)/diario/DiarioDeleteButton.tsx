'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { excluirRegistroAula } from './actions'

export default function DiarioDeleteButton({ registroId }: { registroId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Excluir este registro de aula?')) return
    startTransition(async () => {
      await excluirRegistroAula(registroId)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
      title="Excluir"
    >
      <Trash2 size={15} />
    </button>
  )
}
