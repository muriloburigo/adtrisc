'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { TurmaRow } from '@/types/database'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade'>

export default function PresencaSelector({ turmas }: { turmas: TurmaBasic[] }) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? '')
  const [data, setData] = useState(today)

  function abrir() {
    if (!turmaId || !data) return
    router.push(`/presencas/${turmaId}/${data}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">Turma</label>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        >
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} <span className="text-gray-400 capitalize">· {t.modalidade}</span>
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Data da aula</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      <div className="flex items-end">
        <Button onClick={abrir} disabled={!turmaId || !data}>
          Abrir lista
        </Button>
      </div>
    </div>
  )
}
