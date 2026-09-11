'use client'

import { useRouter } from 'next/navigation'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteAvaliacoes } from './actions'

interface Props {
  turmaId: string
  data: string
  turmaNome: string
  onSuccess?: () => void
  variant?: 'icon' | 'full'
}

export default function DeleteAvaliacaoButton({
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
      label="Excluir avaliação"
      title="Excluir avaliação"
      confirmLabel="Excluir todos os registros desta sessão?"
      action={() => deleteAvaliacoes(turmaId, data, turmaNome)}
      onSuccess={onSuccess ?? (() => router.push('/avaliacoes'))}
    />
  )
}
