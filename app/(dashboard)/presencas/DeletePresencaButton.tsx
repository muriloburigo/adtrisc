'use client'

import { useRouter } from 'next/navigation'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
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
  const router = useRouter()

  return (
    <ConfirmDeleteButton
      variant={variant}
      label="Excluir lista"
      title="Excluir lista"
      confirmLabel="Excluir todos os registros desta sessão?"
      action={() => deletePresencas(turmaId, data, turmaNome)}
      onSuccess={onSuccess ?? (() => router.push('/presencas'))}
    />
  )
}
