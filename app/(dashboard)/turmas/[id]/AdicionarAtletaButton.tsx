'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, UserPlus, UserCheck, Search } from 'lucide-react'
import { atribuirAtletaTurma } from '@/app/(dashboard)/alunos/actions'
import Button from '@/components/ui/Button'
import { calcularIdade } from '@/lib/utils'

type AlunoSemTurma = { id: string; nome: string; sexo: string | null; data_nascimento: string | null }

export default function AdicionarAtletaButton({
  turmaId,
  semTurma,
}: {
  turmaId: string
  semTurma: AlunoSemTurma[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'existente'>('menu')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  function close() {
    setOpen(false)
    setMode('menu')
    setSelectedId(null)
    setSearch('')
    setError(null)
  }

  const filtered = semTurma.filter((a) => a.nome.toLowerCase().includes(search.toLowerCase()))

  function handleAdd() {
    if (!selectedId) return
    setError(null)
    startTransition(async () => {
      const res = await atribuirAtletaTurma(selectedId, turmaId)
      if (res?.error) { setError(res.error); return }
      close()
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" onClick={() => setOpen((v) => !v)}>
        <Plus size={14} />Adicionar atleta
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {mode === 'menu' ? (
            <div className="py-1">
              <Link
                href={`/alunos/novo?turma=${turmaId}`}
                onClick={close}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-500 hover:bg-gray-50 transition-colors"
              >
                <UserPlus size={15} className="text-gray-400" />
                Cadastrar novo atleta
              </Link>
              <button
                onClick={() => setMode('existente')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-navy-500 hover:bg-gray-50 transition-colors"
              >
                <UserCheck size={15} className="text-gray-400" />
                Atleta já cadastrado
                {semTurma.length > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">{semTurma.length} sem turma</span>
                )}
              </button>
            </div>
          ) : (
            <div>
              <div className="px-3 py-2.5 border-b border-gray-100">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar atleta..."
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400">
                    {semTurma.length === 0 ? 'Nenhum atleta sem turma no momento.' : 'Nenhum resultado.'}
                  </p>
                ) : filtered.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors ${
                      selectedId === a.id ? 'bg-sky-50 text-sky-700' : 'text-navy-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{a.nome}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {a.sexo === 'M' ? 'Masc.' : a.sexo === 'F' ? 'Fem.' : ''}
                      {a.data_nascimento ? ` · ${calcularIdade(a.data_nascimento)} anos` : ''}
                    </span>
                  </button>
                ))}
              </div>

              {error && <p className="px-4 py-2 text-xs text-red-500">{error}</p>}

              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-gray-100">
                <button
                  onClick={() => { setMode('menu'); setSelectedId(null); setError(null) }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!selectedId || isPending}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg bg-navy-500 text-white disabled:opacity-40 hover:bg-navy-600 transition-colors"
                >
                  {isPending ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
