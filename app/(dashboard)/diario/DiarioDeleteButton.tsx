'use client'

import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { excluirRegistroAula } from './actions'
import { friendlyError } from '@/lib/errors'

export default function DiarioDeleteButton({ registroId }: { registroId: string }) {
  async function handleDelete() {
    try {
      await excluirRegistroAula(registroId)
    } catch (err) {
      return { error: friendlyError(err instanceof Error ? err : String(err), 'Erro ao excluir registro.') }
    }
  }

  return (
    <ConfirmDeleteButton
      title="Excluir"
      size={15}
      action={handleDelete}
    />
  )
}
