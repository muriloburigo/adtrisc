'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shuffle, AlertTriangle, X } from 'lucide-react'
import { realizarSorteio } from './actions'

interface Props {
  turmaId: string
  turmaNome: string
  totalPendentes: number
  vagas: number
  totalSorteiosAnteriores: number
}

export default function SorteioButton({
  turmaId,
  turmaNome,
  totalPendentes,
  vagas,
  totalSorteiosAnteriores,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const sorteados    = Math.min(totalPendentes, vagas)
  const naoSorteados = Math.max(0, totalPendentes - vagas)

  function confirmar() {
    setError('')
    startTransition(async () => {
      const result = await realizarSorteio(turmaId)
      if (result.error) { setError(result.error); return }
      setOpen(false)
      router.push(`/candidatos/sorteio/${result.sorteioId}`)
    })
  }

  return (
    <>
      <button
        onClick={() => { setError(''); setOpen(true) }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 px-3 py-2 rounded-lg transition-colors"
      >
        <Shuffle size={13} /> Realizar Sorteio
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shuffle size={16} className="text-violet-500" />
                <h2 className="text-sm font-bold text-navy-500">Realizar Sorteio</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Sorteio para a turma <strong className="text-navy-500">{turmaNome}</strong>
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-navy-500">{totalPendentes}</p>
                  <p className="text-xs text-gray-400 mt-0.5">candidatos</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-emerald-600">{sorteados}</p>
                  <p className="text-xs text-gray-400 mt-0.5">sorteados</p>
                </div>
                <div className={`rounded-xl p-3 ${naoSorteados > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <p className={`text-2xl font-bold ${naoSorteados > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{naoSorteados}</p>
                  <p className="text-xs text-gray-400 mt-0.5">não sorteados</p>
                </div>
              </div>

              {totalPendentes <= vagas && (
                <p className="text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                  Há vagas suficientes para todos os candidatos pendentes.
                </p>
              )}

              {totalSorteiosAnteriores > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Esta turma já possui {totalSorteiosAnteriores} sorteio{totalSorteiosAnteriores > 1 ? 's' : ''} anterior{totalSorteiosAnteriores > 1 ? 'es' : ''}. Um novo sorteio irá
                    sobrescrever os status dos candidatos pendentes.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                O resultado será gerado com uma semente aleatória e registrado para auditoria. O processo é irreversível automaticamente.
              </p>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-6 pb-5">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="flex-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={isPending || totalPendentes === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 px-4 py-2.5 rounded-xl transition-colors"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Shuffle size={14} />
                )}
                {isPending ? 'Sorteando…' : 'Confirmar Sorteio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
