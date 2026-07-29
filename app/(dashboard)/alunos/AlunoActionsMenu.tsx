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
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        disabled={pending}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-navy-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
        title="Ações"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
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
              <button
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpen(false)
                  if (!confirm(`Remover "${alunoNome}" da turma?\n\nO atleta ficará como desligado e poderá ser matriculado novamente no futuro.`)) return
                  startTransition(() => removerAlunoTurma(alunoId))
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
              >
                <UserMinus size={14} />
                Remover da turma
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
