'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { saveCampoParaTurma, type EntradaCampo } from '../../actions'
import type { AvaliacaoFisicaRow } from '@/types/database'

type AlunoBasic = { id: string; nome: string }

// ── Critérios ──────────────────────────────────────────────────────────────
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
const GROUPS = ['Medidas Corporais', 'Testes Físicos'] as const

// ── Helpers ────────────────────────────────────────────────────────────────
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

// ── Component ──────────────────────────────────────────────────────────────
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
  const [savedCampos, setSavedCampos] = useState<Set<CampoKey>>(new Set())
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()
  const firstInputRef = useRef<HTMLInputElement>(null)

  const criterio = CRITERIOS.find((c) => c.key === criterioAtivo)!
  const valoresAtivos = valores[criterioAtivo]
  const countAtivos = preenchidos(valoresAtivos, alunos)

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [criterioAtivo])

  function setValor(campo: CampoKey, alunoId: string, v: string) {
    setSavedCampos((prev) => { const n = new Set(prev); n.delete(campo); return n })
    setValores((prev) => ({
      ...prev,
      [campo]: { ...prev[campo], [alunoId]: v },
    }))
  }

  function handleSave() {
    setErro('')
    const entries: EntradaCampo[] = alunos.map((a) => {
      const raw = valoresAtivos[a.id]
      const n = parseFloat(raw.replace(',', '.'))
      return { alunoId: a.id, value: isNaN(n) ? null : n }
    })

    startTransition(async () => {
      const result = await saveCampoParaTurma(turmaId, data, criterioAtivo, entries)
      if (result.error) { setErro(result.error); return }
      setSavedCampos((prev) => new Set(prev).add(criterioAtivo))
    })
  }

  function proximoCriterio() {
    const idx = CRITERIOS.findIndex((c) => c.key === criterioAtivo)
    if (idx < CRITERIOS.length - 1) setCriterioAtivo(CRITERIOS[idx + 1].key)
  }

  const isSaved = savedCampos.has(criterioAtivo)

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">

      {/* ── Painel esquerdo: lista de critérios ── */}
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
                    ativo
                      ? 'bg-sky-400 text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
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

      {/* ── Painel direito: entrada ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Cabeçalho do critério */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between gap-4 bg-white">
          <div>
            <p className="font-bold text-navy-500">{criterio.label}</p>
            <p className="text-xs text-gray-400">{criterio.unit} · {countAtivos}/{alunos.length} preenchidos</p>
          </div>
          <div className="flex items-center gap-2">
            {isSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle size={13} /> Salvo
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={proximoCriterio}
              disabled={criterioAtivo === CRITERIOS[CRITERIOS.length - 1].key}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-2"
              title="Próximo critério"
            >
              Próximo <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {erro && (
          <p className="mx-6 mt-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
        )}

        {/* Lista de atletas */}
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
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                    filled ? 'bg-sky-400' : 'bg-gray-300'
                  }`}
                >
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        // move to next input
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
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer fixo */}
        <div className="px-6 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Enter ou Tab para avançar entre atletas
          </p>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="bg-navy-500 hover:bg-navy-600 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            {isPending ? 'Salvando...' : `Salvar ${criterio.label}`}
          </button>
        </div>
      </main>
    </div>
  )
}
