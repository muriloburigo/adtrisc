'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { salvarProcessoSgpe, excluirProcessoSgpe } from './actions'
import type { ProcessoSgpe } from '@/lib/processoSgpe'

const inputClass = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400'
const labelClass = 'block text-[11px] text-gray-400 mb-1'

function Editor({ processo, onFechar }: { processo?: ProcessoSgpe; onFechar: () => void }) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setErro(null)
    startTransition(async () => {
      const res = await salvarProcessoSgpe(fd)
      if (res?.error) { setErro(res.error); return }
      onFechar()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-sky-200 bg-sky-50/40 p-3 space-y-3">
      <input type="hidden" name="id" value={processo?.id ?? ''} />
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem_1fr]">
        <div>
          <label className={labelClass}>Projeto</label>
          <input name="projeto" required defaultValue={processo?.projeto ?? ''} placeholder="Escolinha de Triathlon São José" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ano</label>
          <input name="ano" type="number" required min={2000} max={2100} defaultValue={processo?.ano ?? new Date().getFullYear()} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Processo SGPE</label>
          <input name="processo" required defaultValue={processo?.processo ?? ''} placeholder="FESPORTE 5217/2025" className={inputClass} />
        </div>
      </div>
      {erro && <p className="text-sm text-red-500">{erro}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onFechar} className="text-sm text-gray-400 hover:text-gray-600 px-3">Cancelar</button>
        <button type="submit" disabled={pending} className="text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2 disabled:opacity-60">
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

export default function ProcessosSgpeForm({ processos }: { processos: ProcessoSgpe[] }) {
  const [editando, setEditando] = useState<string | 'novo' | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Preenche sozinho o processo no relatório da turma, no diário de aulas e na ficha de inscrição. Cada turma usa o
        processo escolhido no cadastro dela; se não escolher, usa o do ano quando o ano tiver um só. Nos relatórios o
        campo continua editável.
      </p>

      {processos.length === 0 && editando !== 'novo' && (
        <p className="text-sm text-gray-400">Nenhum processo cadastrado.</p>
      )}

      <ul className="divide-y divide-gray-100">
        {processos.map((p) => (
          <li key={p.id} className="py-2.5">
            {editando === p.id ? (
              <Editor processo={p} onFechar={() => setEditando(null)} />
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-500">SGPE {p.processo}</p>
                  <p className="text-xs text-gray-400 truncate">{p.projeto} · {p.ano}</p>
                </div>
                <button onClick={() => setEditando(p.id)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50">
                  <Pencil size={14} />
                </button>
                <ConfirmDeleteButton title="Excluir processo" action={() => excluirProcessoSgpe(p.id)} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {editando === 'novo' ? (
        <Editor onFechar={() => setEditando(null)} />
      ) : (
        <button onClick={() => setEditando('novo')} className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-500 hover:text-sky-600">
          <Plus size={14} /> Adicionar processo
        </button>
      )}
    </div>
  )
}
