'use client'

import { useRouter } from 'next/navigation'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { deleteAvaliacao } from '../../../../avaliacoes/actions'

export default function DeleteAvaliacaoIndividualButton({
  avaliacaoId,
  alunoId,
}: {
  avaliacaoId: string
  alunoId: string
}) {
  const router = useRouter()

  return (
    <ConfirmDeleteButton
      variant="full"
      label="Excluir avaliação"
      confirmLabel="Excluir esta avaliação?"
      action={() => deleteAvaliacao(avaliacaoId, alunoId)}
      onSuccess={() => router.push(`/alunos/${alunoId}`)}
    />
  )
}
