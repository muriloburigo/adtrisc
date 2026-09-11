'use client'

import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteUser } from './actions'

export default function DeleteUserButton({ userId, nome }: { userId: string; nome: string }) {
  return (
    <ConfirmDeleteButton
      variant="full"
      label="Excluir"
      title="Excluir usuário"
      confirmLabel={`Excluir ${nome}?`}
      action={() => deleteUser(userId)}
    />
  )
}
