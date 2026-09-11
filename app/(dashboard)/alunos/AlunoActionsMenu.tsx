'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Pencil, UserMinus } from 'lucide-react'
import { removerAlunoTurma } from './actions'

export default function AlunoActionsMenu({
  alunoId,
  alunoNome,
  turmaId,
}: {
  alunoId: string
  alunoNome: string
  turmaId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirmingRemove(false) }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const res = await removerAlunoTurma(alunoId)
      if (res?.error) {
        setError(res.error)
        setTimeout(() => setError(null), 5000)
      }
      setOpen(false)
      setConfirmingRemove(false)
    })
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        disabled={pending}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
          setConfirmingRemove(false)
        }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-navy-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
        title="Ações"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          <Link
            href={`/alunos/${alunoId}/editar`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-navy-500 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} className="text-gray-400" />
            Editar
          </Link>

          {turmaId && (
            <>
              <div className="border-t border-gray-100 my-1" />
              {confirmingRemove ? (
                <div className="px-4 py-2.5 space-y-2">
                  <p className="text-xs text-gray-500">
                    Remover &quot;{alunoNome}&quot; da turma? O atleta ficará como desligado e poderá ser matriculado novamente no futuro.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove() }}
                      disabled={pending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {pending ? 'Removendo…' : 'Confirmar'}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingRemove(false) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled={pending}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setError(null)
                    setConfirmingRemove(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <UserMinus size={14} />
                  Remover da turma
                </button>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-9 z-50 w-56 text-xs text-red-500 bg-white border border-red-100 rounded-xl shadow-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
