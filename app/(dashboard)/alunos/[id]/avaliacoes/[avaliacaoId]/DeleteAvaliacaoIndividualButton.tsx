'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteAvaliacao } from '../../../../avaliacoes/actions'

export default function DeleteAvaliacaoIndividualButton({
  avaliacaoId,
  alunoId,
}: {
  avaliacaoId: string
  alunoId: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        await deleteAvaliacao(avaliacaoId, alunoId)
        router.push(`/alunos/${alunoId}`)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erro ao excluir')
        setConfirming(false)
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}
      {confirming ? (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-600">Excluir esta avaliação?</span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isPending ? 'Excluindo…' : 'Sim, excluir'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError(null) }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
          Excluir avaliação
        </button>
      )}
    </div>
  )
}
