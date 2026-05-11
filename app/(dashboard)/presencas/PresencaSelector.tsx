'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import type { TurmaRow } from '@/types/database'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

export default function PresencaSelector({ turmas }: { turmas: TurmaBasic[] }) {
  const router = useRouter()
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD no fuso local
  const [turmaId, setTurmaId] = useState('')
  const [data, setData] = useState(today)

  function abrir() {
    if (!turmaId || !data) return
    router.push(`/presencas/${turmaId}/${data}`)
  }

  const disabled = !turmaId || !data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Turma
          </label>
          <select
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            <option value="" disabled>Selecione uma turma</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} · {t.modalidade}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Data da aula
          </label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
      </div>

      <button
        onClick={abrir}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 bg-sky-400 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-xl transition-colors"
      >
        <ClipboardCheck size={20} />
        Abrir lista de presença
      </button>
    </div>
  )
}
