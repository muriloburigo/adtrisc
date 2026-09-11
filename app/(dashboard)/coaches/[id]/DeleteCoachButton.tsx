'use client'

import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteCoach } from '../actions'

export default function DeleteCoachButton({ id, name }: { id: string; name: string }) {
  return (
    <ConfirmDeleteButton
      variant="full"
      label="Remover"
      confirmLabel={`Remover ${name}?`}
      action={() => deleteCoach(id)}
    />
  )
}
