'use client'

import { useTransition } from 'react'
import { UserMinus } from 'lucide-react'
import { removerAlunoTurma } from './actions'

export default function RemoverDaTurmaButton({
  alunoId,
  alunoNome,
}: {
  alunoId: string
  alunoNome: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm(`Remover "${alunoNome}" da turma?\n\nO atleta ficará como desligado e poderá ser matriculado novamente no futuro.`)) return
        startTransition(() => removerAlunoTurma(alunoId))
      }}
      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      title="Remover da turma"
    >
      <UserMinus size={15} />
    </button>
  )
}
