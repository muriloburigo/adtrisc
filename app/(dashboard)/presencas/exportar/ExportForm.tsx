'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TurmaBasic = { id: string; nome: string; modalidade: string }

const MODALIDADE_LABEL: Record<string, string> = {
  natacao: 'Natação',
  ciclismo: 'Ciclismo',
  corrida: 'Corrida',
  triathlon: 'Triathlon',
}

function getMonthRange(monthOffset: number): { inicio: string; fim: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + monthOffset
  const first = new Date(year, month, 1)
  const last = monthOffset === 0
    ? now
    : new Date(year, month + 1, 0)
  return {
    inicio: first.toLocaleDateString('en-CA'),
    fim: last.toLocaleDateString('en-CA'),
  }
}

const PRESETS = [
  { label: 'Este mês', fn: () => getMonthRange(0) },
  { label: 'Mês passado', fn: () => getMonthRange(-1) },
  { label: '3 meses', fn: () => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { inicio: first.toLocaleDateString('en-CA'), fim: now.toLocaleDateString('en-CA') }
  }},
]

export default function ExportForm({
  turmas,
  initialTurma,
  initialInicio,
  initialFim,
  initialLocal,
  initialProcesso,
}: {
  turmas: TurmaBasic[]
  initialTurma: string
  initialInicio: string
  initialFim: string
  initialLocal: string
  initialProcesso: string
}) {
  const router = useRouter()
  const defaultDates = getMonthRange(0)

  const [turmaId, setTurmaId] = useState(initialTurma || '')
  const [inicio, setInicio] = useState(initialInicio || defaultDates.inicio)
  const [fim, setFim] = useState(initialFim || defaultDates.fim)
  const [local, setLocal] = useState(initialLocal || 'Beira Mar São José')
  const [processo, setProcesso] = useState(initialProcesso || '')

  function applyPreset(fn: () => { inicio: string; fim: string }) {
    const { inicio: i, fim: f } = fn()
    setInicio(i)
    setFim(f)
  }

  function visualizar() {
    if (!turmaId || !inicio || !fim) return
    const params = new URLSearchParams({ turma: turmaId, inicio, fim, local })
    if (processo) params.set('processo', processo)
    router.push(`/presencas/exportar?${params}`)
  }

  const disabled = !turmaId || !inicio || !fim

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Turma
        </label>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        >
          <option value="" disabled>Selecione a turma</option>
          {turmas.length === 0 && (
            <option value="" disabled>Nenhuma turma ativa</option>
          )}
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} · {MODALIDADE_LABEL[t.modalidade] ?? t.modalidade}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Local do atendimento
          </label>
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex: Beira Mar São José"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Processo SGPE <span className="normal-case font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={processo}
            onChange={(e) => setProcesso(e.target.value)}
            placeholder="Ex: 5217/2025"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Período
          </label>
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.fn)}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-sky-400 hover:text-sky-500 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">De</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Até</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            />
          </div>
        </div>
      </div>

      <button
        onClick={visualizar}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 bg-navy-500 hover:bg-navy-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl transition-colors"
      >
        Visualizar lista de chamada
      </button>
    </div>
  )
}
