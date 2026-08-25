'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, CheckCircle, Loader, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { criarMultiplosRegistros } from './actions'
import { friendlyError } from '@/lib/errors'

const MODALIDADES = [
  { value: 'corrida',  label: 'Corrida' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'natacao',  label: 'Natação' },
]

type TurmaBasic = { id: string; nome: string }

type InitialDay = {
  date: string
  modalidade: string
  descricao: string
  observacoes: string
  turmaIds: string[]
}

type DayEntry = {
  key: string
  date: string
  modalidade: string
  descricao: string
  observacoes: string
}

type Draft = {
  turmaIds: string[]
  entries: DayEntry[]
}

function loadDraft(key: string): Draft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function DiarioBatchForm({
  initialDays,
  allTurmas,
  targetCoachId,
  mes,
  ano,
}: {
  initialDays: InitialDay[]
  allTurmas: TurmaBasic[]
  targetCoachId?: string
  mes: number
  ano: number
}) {
  const router = useRouter()
  const [newDate, setNewDate]     = useState('')
  const [addError, setAddError]   = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null)
  const isFirstRun = useRef(true)
  const addCounter = useRef(0)

  const storageKey = `diario-draft-${targetCoachId ?? 'self'}-${ano}-${mes}`

  const [selectedTurmaIds, setSelectedTurmaIds] = useState<Set<string>>(() => {
    const draft = loadDraft(storageKey)
    if (draft?.turmaIds?.length) return new Set(draft.turmaIds)
    const allIds = new Set(initialDays.flatMap((d) => d.turmaIds))
    return allIds.size > 0 ? allIds : new Set(allTurmas.map((t) => t.id))
  })

  const [entries, setEntries] = useState<DayEntry[]>(() => {
    const draft = loadDraft(storageKey)
    const draftMap: Record<string, DayEntry> = {}
    for (const e of draft?.entries ?? []) draftMap[e.date] = e

    const fromInitial = initialDays.map((day) => ({
      key: day.date,
      date: day.date,
      modalidade:  draftMap[day.date]?.modalidade  ?? day.modalidade,
      descricao:   draftMap[day.date]?.descricao   ?? day.descricao,
      observacoes: draftMap[day.date]?.observacoes ?? day.observacoes,
    }))

    const manualDays = (draft?.entries ?? []).filter(
      (e) => !initialDays.some((d) => d.date === e.date)
    )

    return [...fromInitial, ...manualDays].sort((a, b) => a.date.localeCompare(b.date))
  })

  // Autosave: debounced 800ms → localStorage + server
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    setSaveStatus('saving')
    let cancelled = false

    const timer = setTimeout(async () => {
      // Always save draft locally
      localStorage.setItem(storageKey, JSON.stringify({ turmaIds: [...selectedTurmaIds], entries }))

      // Save to server when there's something to save
      if (entries.length > 0 && selectedTurmaIds.size > 0) {
        try {
          const res = await criarMultiplosRegistros(
            entries.map((en) => ({
              data:        en.date,
              modalidade:  en.modalidade,
              objetivo:    en.descricao,
              descricao:   '',
              observacoes: en.observacoes,
              turmaIds:    [...selectedTurmaIds],
            })),
            targetCoachId
          )
          if (!cancelled) {
            if (res?.error) {
              setSaveErrorMsg(res.error)
              setSaveStatus('error')
            } else {
              setSaveStatus('saved')
              router.refresh()
            }
          }
        } catch (err) {
          if (!cancelled) {
            setSaveErrorMsg(friendlyError(err instanceof Error ? err : String(err), 'Erro ao salvar — tente novamente.'))
            setSaveStatus('error')
          }
        }
      } else {
        if (!cancelled) setSaveStatus('idle')
      }
    }, 800)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [entries, selectedTurmaIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear "saved" indicator after 3 s
  useEffect(() => {
    if (saveStatus !== 'saved') return
    const t = setTimeout(() => setSaveStatus('idle'), 3000)
    return () => clearTimeout(t)
  }, [saveStatus])

  function toggleTurma(turmaId: string) {
    setSelectedTurmaIds((prev) => {
      const next = new Set(prev)
      next.has(turmaId) ? next.delete(turmaId) : next.add(turmaId)
      return next
    })
  }

  function update(key: string, patch: Partial<Omit<DayEntry, 'key'>>) {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  function addDay() {
    if (!newDate) return
    setAddError('')
    if (entries.some((e) => e.date === newDate)) {
      setAddError('Esta data já está na lista')
      return
    }
    const key = `manual-${newDate}-${++addCounter.current}`
    setEntries((prev) =>
      [...prev, { key, date: newDate, modalidade: '', descricao: '', observacoes: '' }]
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setNewDate('')
  }

  function removeEntry(key: string) {
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'

  return (
    <div className="space-y-6">

      {/* Global turma selector */}
      <div>
        <p className={labelCls}>Turmas</p>
        <div className="flex flex-wrap gap-2">
          {allTurmas.map((t) => (
            <label
              key={t.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-semibold select-none ${
                selectedTurmaIds.has(t.id)
                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTurmaIds.has(t.id)}
                onChange={() => toggleTurma(t.id)}
                className="w-3 h-3 accent-sky-400"
              />
              {t.nome}
            </label>
          ))}
        </div>
      </div>

      {/* Day sections */}
      {entries.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          Nenhum registro neste mês. Adicione uma data abaixo.
        </p>
      )}

      {entries.map((entry) => (
        <div key={entry.key} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span className="text-sm font-bold text-navy-500">{formatDate(entry.date)}</span>
            <button
              type="button"
              onClick={() => removeEntry(entry.key)}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div>
              <label className={labelCls}>Modalidade</label>
              <select
                value={entry.modalidade}
                onChange={(e) => update(entry.key, { modalidade: e.target.value })}
                className={inputCls}
              >
                <option value="" disabled>Selecione...</option>
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Descrição do treino</label>
              <textarea
                rows={3}
                value={entry.descricao}
                onChange={(e) => update(entry.key, { descricao: e.target.value })}
                placeholder="Descreva as atividades realizadas..."
                className={`${inputCls} resize-y`}
              />
            </div>

            <div>
              <label className={labelCls}>Observações / Intercorrências</label>
              <textarea
                rows={2}
                value={entry.observacoes}
                onChange={(e) => update(entry.key, { observacoes: e.target.value })}
                placeholder="Ex: aula cancelada por chuva..."
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Add manual day */}
      <div className="space-y-1.5">
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={newDate}
            onChange={(e) => { setNewDate(e.target.value); setAddError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDay() } }}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
          <button
            type="button"
            onClick={addDay}
            disabled={!newDate}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-navy-500 font-semibold text-sm rounded-xl transition-colors disabled:opacity-40"
          >
            <Plus size={15} />
            Adicionar dia
          </button>
        </div>
        {addError && <p className="text-xs text-red-500 pl-1">{addError}</p>}
      </div>

      {/* Save status */}
      <div className="flex justify-end pt-1">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader size={13} className="animate-spin" />
            Salvando...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500">
            <CheckCircle size={13} />
            Salvo automaticamente
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle size={13} />
            {saveErrorMsg ?? 'Erro ao salvar — tente novamente'}
          </span>
        )}
      </div>
    </div>
  )
}
