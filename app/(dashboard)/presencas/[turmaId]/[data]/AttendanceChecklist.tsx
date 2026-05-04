'use client'

import { useState, useTransition } from 'react'
import { Check, X, AlertCircle, CheckCircle } from 'lucide-react'
import { savePresencas, type EntradaPresenca } from '../../actions'
import type { AlunoRow, PresencaRow } from '@/types/database'

type AlunoBasic = Pick<AlunoRow, 'id' | 'nome'>

type Estado = 'presente' | 'falta' | 'justificada'

function initEstados(
  alunos: AlunoBasic[],
  presencas: PresencaRow[],
): Map<string, Estado> {
  const map = new Map<string, Estado>()
  for (const a of alunos) {
    const p = presencas.find((p) => p.aluno_id === a.id)
    if (p) {
      map.set(a.id, p.presente ? 'presente' : p.justificada ? 'justificada' : 'falta')
    } else {
      map.set(a.id, 'presente')
    }
  }
  return map
}

export default function AttendanceChecklist({
  turmaId,
  data,
  turmaLabel,
  alunos,
  presencasExistentes,
  savedParam,
}: {
  turmaId: string
  data: string
  turmaLabel: string
  alunos: AlunoBasic[]
  presencasExistentes: PresencaRow[]
  savedParam: boolean
}) {
  const [estados, setEstados] = useState<Map<string, Estado>>(
    () => initEstados(alunos, presencasExistentes),
  )
  const [saved, setSaved] = useState(savedParam)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSaved(false)
    setEstados((prev) => {
      const next = new Map(prev)
      const atual = prev.get(id) ?? 'presente'
      next.set(id, atual === 'presente' ? 'falta' : 'presente')
      return next
    })
  }

  function toggleJustificada(id: string) {
    setSaved(false)
    setEstados((prev) => {
      const next = new Map(prev)
      const atual = prev.get(id)
      if (atual === 'falta') next.set(id, 'justificada')
      else if (atual === 'justificada') next.set(id, 'falta')
      return next
    })
  }

  function handleSave() {
    const entries: EntradaPresenca[] = alunos.map((a) => {
      const e = estados.get(a.id) ?? 'presente'
      return {
        alunoId: a.id,
        presente: e === 'presente',
        justificada: e === 'justificada',
      }
    })
    startTransition(async () => {
      await savePresencas(turmaId, data, entries)
      setSaved(true)
    })
  }

  const presentes = [...estados.values()].filter((e) => e === 'presente').length
  const faltas    = [...estados.values()].filter((e) => e !== 'presente').length

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center gap-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Check size={15} /> {presentes} presente{presentes !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
          <X size={15} /> {faltas} falta{faltas !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {alunos.map((aluno) => {
          const estado = estados.get(aluno.id) ?? 'presente'
          const presente = estado === 'presente'

          return (
            <div
              key={aluno.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                presente
                  ? 'border-emerald-200 bg-emerald-50'
                  : estado === 'justificada'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                    presente ? 'bg-emerald-500' : estado === 'justificada' ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                >
                  {aluno.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-navy-500 text-sm leading-tight">{aluno.nome}</p>
                  {!presente && (
                    <button
                      onClick={() => toggleJustificada(aluno.id)}
                      className={`text-xs mt-0.5 font-medium underline underline-offset-2 ${
                        estado === 'justificada'
                          ? 'text-amber-600'
                          : 'text-red-400 hover:text-red-600'
                      }`}
                    >
                      {estado === 'justificada' ? 'Justificada' : 'Justificar falta'}
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(aluno.id)}
                className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  presente
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-600'
                    : 'bg-red-100 text-red-600 hover:bg-emerald-100 hover:text-emerald-700'
                }`}
              >
                {presente ? (
                  <><Check size={14} /> P</>
                ) : (
                  <><X size={14} /> F</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Salvar */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 sm:flex-none bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          {isPending ? 'Salvando...' : 'Salvar presenças'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <CheckCircle size={15} /> Salvo
          </span>
        )}
      </div>

      {alunos.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <AlertCircle size={16} />
          Nenhum aluno cadastrado nesta turma.
        </div>
      )}
    </div>
  )
}
