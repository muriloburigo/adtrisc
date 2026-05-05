'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { saveCampoParaTurma, type EntradaCampo } from '../../actions'
import type { AvaliacaoFisicaRow } from '@/types/database'

type AlunoBasic = { id: string; nome: string }

const CRITERIOS = [
  { key: 'massa_corporal',         label: 'Massa Corporal',       unit: 'kg',  step: '0.1',  group: 'Medidas Corporais' },
  { key: 'estatura',               label: 'Estatura',             unit: 'm',   step: '0.001', group: 'Medidas Corporais' },
  { key: 'perimetro_cintura',      label: 'Perímetro da Cintura', unit: 'cm',  step: '0.1',  group: 'Medidas Corporais' },
  { key: 'envergadura',            label: 'Envergadura',          unit: 'cm',  step: '0.1',  group: 'Medidas Corporais' },
  { key: 'estatura_sentado',       label: 'Estatura Sentado',     unit: 'cm',  step: '0.1',  group: 'Medidas Corporais' },
  { key: 'sentar_alcancar',        label: 'Sentar e Alcançar',    unit: 'cm',  step: '0.1',  group: 'Testes Físicos' },
  { key: 'resistencia_6min',       label: "Resistência 6'",       unit: 'm',   step: '1',    group: 'Testes Físicos' },
  { key: 'forca_abdominal',        label: 'Força Abdominal',      unit: 'rep', step: '1',    group: 'Testes Físicos' },
  { key: 'arremesso_medicineball', label: 'Medicineball',         unit: 'm',   step: '0.01', group: 'Testes Físicos' },
  { key: 'agilidade',              label: 'Agilidade',            unit: 's',   step: '0.01', group: 'Testes Físicos' },
  { key: 'salto_horizontal',       label: 'Salto Horizontal',     unit: 'm',   step: '0.01', group: 'Testes Físicos' },
  { key: 'corrida_20m',            label: 'Corrida de 20m',       unit: 's',   step: '0.01', group: 'Testes Físicos' },
  { key: 'natacao_12min',          label: "12' Natação",          unit: 'm',   step: '1',    group: 'Testes Físicos' },
] as const

type CampoKey = typeof CRITERIOS[number]['key']
type FieldStatus = 'saving' | 'saved' | 'error'

const GROUPS = ['Medidas Corporais', 'Testes Físicos'] as const

function initValores(
  alunos: AlunoBasic[],
  avaliacaoMap: Record<string, Partial<AvaliacaoFisicaRow>>,
): Record<CampoKey, Record<string, string>> {
  const result = {} as Record<CampoKey, Record<string, string>>
  for (const c of CRITERIOS) {
    result[c.key] = {}
    for (const a of alunos) {
      const val = avaliacaoMap[a.id]?.[c.key as keyof AvaliacaoFisicaRow]
      result[c.key][a.id] = val != null ? String(val) : ''
    }
  }
  return result
}

function preenchidos(valores: Record<string, string>, alunos: AlunoBasic[]): number {
  return alunos.filter((a) => valores[a.id] !== '').length
}

export default function CriterioPanel({
  turmaId,
  data,
  alunos,
  avaliacaoMap,
}: {
  turmaId: string
  data: string
  alunos: AlunoBasic[]
  avaliacaoMap: Record<string, Partial<AvaliacaoFisicaRow>>
}) {
  const [valores, setValores] = useState(() => initValores(alunos, avaliacaoMap))
  const [criterioAtivo, setCriterioAtivo] = useState<CampoKey>(CRITERIOS[0].key)
  const [fieldStatuses, setFieldStatuses] = useState<Map<string, FieldStatus>>(new Map())
  const [erro, setErro] = useState('')
  const firstInputRef = useRef<HTMLInputElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  // Tracks value at focus time to detect whether a change occurred
  const focusInfoRef = useRef<{ alunoId: string; value: string } | null>(null)

  const criterio = CRITERIOS.find((c) => c.key === criterioAtivo)!
  const valoresAtivos = valores[criterioAtivo]
  const countAtivos = preenchidos(valoresAtivos, alunos)
  const criterioIdx = CRITERIOS.findIndex((c) => c.key === criterioAtivo)
  const isFirst = criterioIdx === 0
  const isLast = criterioIdx === CRITERIOS.length - 1

  useEffect(() => {
    firstInputRef.current?.focus()
    const activeTab = tabsRef.current?.querySelector('[data-active="true"]')
    activeTab?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [criterioAtivo])

  function setValor(campo: CampoKey, alunoId: string, v: string) {
    setValores((prev) => ({ ...prev, [campo]: { ...prev[campo], [alunoId]: v } }))
  }

  function handleFocus(alunoId: string) {
    focusInfoRef.current = { alunoId, value: valoresAtivos[alunoId] ?? '' }
  }

  function handleBlur(alunoId: string) {
    const current = valoresAtivos[alunoId] ?? ''
    // Skip if value didn't change since focus
    if (focusInfoRef.current?.value === current) {
      focusInfoRef.current = null
      return
    }
    focusInfoRef.current = null

    const key = `${criterioAtivo}__${alunoId}`
    const n = parseFloat(current.replace(',', '.'))
    const value: EntradaCampo['value'] = current === '' ? null : isNaN(n) ? null : n

    setFieldStatuses((prev) => new Map(prev).set(key, 'saving'))
    setErro('')

    saveCampoParaTurma(turmaId, data, criterioAtivo, [{ alunoId, value }])
      .then((result) => {
        if (result.error) {
          setFieldStatuses((prev) => new Map(prev).set(key, 'error'))
          setErro(result.error)
        } else {
          setFieldStatuses((prev) => new Map(prev).set(key, 'saved'))
        }
      })
      .catch(() => {
        setFieldStatuses((prev) => new Map(prev).set(key, 'error'))
      })
  }

  function anteriorCriterio() {
    if (!isFirst) setCriterioAtivo(CRITERIOS[criterioIdx - 1].key)
  }

  function proximoCriterio() {
    if (!isLast) setCriterioAtivo(CRITERIOS[criterioIdx + 1].key)
  }

  function renderFieldStatus(alunoId: string) {
    const status = fieldStatuses.get(`${criterioAtivo}__${alunoId}`)
    if (status === 'saving') return (
      <span className="w-4 h-4 flex items-center justify-center">
        <span className="w-3 h-3 rounded-full border-2 border-gray-300 border-t-sky-400 animate-spin inline-block" />
      </span>
    )
    if (status === 'saved') return <Check size={14} className="text-emerald-500 flex-shrink-0" />
    if (status === 'error') return <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
    return <span className="w-4" />
  }

  return (
    <>
      {/* ════════════════════════════════════════
          MOBILE LAYOUT (< md)
      ════════════════════════════════════════ */}
      <div className="flex flex-col md:hidden flex-1 min-h-0">

        {/* Horizontal scrollable criteria tabs */}
        <div ref={tabsRef} className="flex overflow-x-auto gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100 scrollbar-hide flex-shrink-0">
          {CRITERIOS.map((c) => {
            const count = preenchidos(valores[c.key], alunos)
            const done  = count === alunos.length && alunos.length > 0
            const ativo = c.key === criterioAtivo
            return (
              <button
                key={c.key}
                data-active={ativo}
                onClick={() => setCriterioAtivo(c.key)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  ativo
                    ? 'bg-sky-400 text-white'
                    : done
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span className="whitespace-nowrap">{c.label}</span>
                <span className={`text-[10px] font-bold tabular-nums mt-0.5 ${ativo ? 'text-white/80' : done ? 'text-emerald-500' : 'text-gray-400'}`}>
                  {count}/{alunos.length}
                </span>
              </button>
            )
          })}
        </div>

        {/* Criterion header */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-navy-500 truncate">{criterio.label}</p>
            <p className="text-xs text-gray-400">{criterio.unit} · {countAtivos}/{alunos.length} preenchidos</p>
          </div>
          <span className="text-xs text-gray-300 flex-shrink-0">autosave</span>
        </div>

        {erro && <p className="mx-4 mt-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

        {/* Athlete list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {alunos.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">Nenhum(a) atleta ativo(a) nesta turma.</p>
          )}
          {alunos.map((aluno, idx) => {
            const val = valoresAtivos[aluno.id] ?? ''
            const filled = val !== ''
            return (
              <div
                key={aluno.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  filled ? 'border-sky-100 bg-sky-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${filled ? 'bg-sky-400' : 'bg-gray-300'}`}>
                  {aluno.nome.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-medium text-navy-500 min-w-0 truncate">{aluno.nome}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="number"
                    inputMode="decimal"
                    step={criterio.step}
                    min="0"
                    value={val}
                    onChange={(e) => setValor(criterioAtivo, aluno.id, e.target.value)}
                    onFocus={() => handleFocus(aluno.id)}
                    onBlur={() => handleBlur(aluno.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const inputs = document.querySelectorAll<HTMLInputElement>('[data-criterio-input]')
                        const i = Array.from(inputs).findIndex((el) => el === e.currentTarget)
                        inputs[i + 1]?.focus()
                      }
                    }}
                    data-criterio-input
                    placeholder="—"
                    className="w-20 text-right border border-gray-200 rounded-lg px-2 py-2.5 text-base font-mono text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                  <span className="text-xs text-gray-400 w-7">{criterio.unit}</span>
                  {renderFieldStatus(aluno.id)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Fixed bottom navigation — prev / next only */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-2">
          <button
            onClick={anteriorCriterio}
            disabled={isFirst}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2.5 rounded-xl border border-gray-200 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex-1 text-center">
            <p className="text-xs font-semibold text-navy-500 truncate px-2">{criterio.label}</p>
            <p className="text-[10px] text-gray-400">{criterioIdx + 1} / {CRITERIOS.length}</p>
          </div>
          <button
            onClick={proximoCriterio}
            disabled={isLast}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2.5 rounded-xl border border-gray-200 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          DESKTOP LAYOUT (≥ md)
      ════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 overflow-hidden min-h-0">

        {/* Left panel: criteria list */}
        <aside className="w-52 lg:w-64 border-r border-gray-100 bg-gray-50 overflow-y-auto flex-shrink-0">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="px-4 pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {group}
              </p>
              {CRITERIOS.filter((c) => c.group === group).map((c) => {
                const count = preenchidos(valores[c.key], alunos)
                const done  = count === alunos.length && alunos.length > 0
                const ativo = c.key === criterioAtivo
                return (
                  <button
                    key={c.key}
                    onClick={() => setCriterioAtivo(c.key)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 text-sm transition-colors ${
                      ativo ? 'bg-sky-400 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className={`flex-shrink-0 text-xs font-bold tabular-nums ${
                      ativo ? 'text-white/80' : done ? 'text-emerald-500' : 'text-gray-400'
                    }`}>
                      {count}/{alunos.length}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* Right panel: input */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
            <div>
              <p className="font-bold text-navy-500">{criterio.label}</p>
              <p className="text-xs text-gray-400">{criterio.unit} · {countAtivos}/{alunos.length} preenchidos</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-300">autosave</span>
              <button
                onClick={proximoCriterio}
                disabled={isLast}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-2"
              >
                Próximo <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {erro && <p className="mx-6 mt-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {alunos.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">Nenhum(a) atleta ativo(a) nesta turma.</p>
            )}
            {alunos.map((aluno, idx) => {
              const val = valoresAtivos[aluno.id] ?? ''
              const filled = val !== ''
              return (
                <div
                  key={aluno.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    filled ? 'border-sky-100 bg-sky-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${filled ? 'bg-sky-400' : 'bg-gray-300'}`}>
                    {aluno.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-navy-500">{aluno.nome}</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={idx === 0 ? firstInputRef : undefined}
                      type="number"
                      inputMode="decimal"
                      step={criterio.step}
                      min="0"
                      value={val}
                      onChange={(e) => setValor(criterioAtivo, aluno.id, e.target.value)}
                      onFocus={() => handleFocus(aluno.id)}
                      onBlur={() => handleBlur(aluno.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const inputs = document.querySelectorAll<HTMLInputElement>('[data-criterio-input]')
                          const i = Array.from(inputs).findIndex((el) => el === e.currentTarget)
                          inputs[i + 1]?.focus()
                        }
                      }}
                      data-criterio-input
                      placeholder="—"
                      className="w-24 text-right border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                    />
                    <span className="text-xs text-gray-400 w-8">{criterio.unit}</span>
                    {renderFieldStatus(aluno.id)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="px-6 py-3 border-t border-gray-100 bg-white">
            <p className="text-xs text-gray-400">Enter ou Tab para avançar · valores salvos automaticamente</p>
          </div>
        </main>
      </div>
    </>
  )
}
