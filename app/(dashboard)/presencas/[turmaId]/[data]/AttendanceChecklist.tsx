'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, AlertCircle } from 'lucide-react'
import { savePresencas, type EntradaPresenca } from '../../actions'
import DeletePresencaButton from '../../DeletePresencaButton'
import type { AlunoRow, PresencaRow } from '@/types/database'

type AlunoBasic = Pick<AlunoRow, 'id' | 'nome' | 'status'>

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
      // Atleta inativo entra automaticamente como falta justificada, não precisa marcar manualmente
      map.set(a.id, a.status === 'inativo' ? 'justificada' : 'presente')
    }
  }
  return map
}

export default function AttendanceChecklist({
  turmaId,
  data,
  turmaLabel,
  turmaNome,
  alunos,
  presencasExistentes,
}: {
  turmaId: string
  data: string
  turmaLabel: string
  turmaNome: string
  alunos: AlunoBasic[]
  presencasExistentes: PresencaRow[]
}) {
  const router = useRouter()
  const [estados, setEstados] = useState<Map<string, Estado>>(
    () => initEstados(alunos, presencasExistentes),
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setEstados((prev) => {
      const next = new Map(prev)
      const atual = prev.get(id) ?? 'presente'
      next.set(id, atual === 'presente' ? 'falta' : 'presente')
      return next
    })
  }

  function toggleJustificada(id: string) {
    setEstados((prev) => {
      const next = new Map(prev)
      const atual = prev.get(id)
      if (atual === 'falta') next.set(id, 'justificada')
      else if (atual === 'justificada') next.set(id, 'falta')
      return next
    })
  }

  function handleSave() {
    setSaveError(null)
    const entries: EntradaPresenca[] = alunos.map((a) => {
      const e = estados.get(a.id) ?? 'presente'
      return {
        alunoId: a.id,
        presente: e === 'presente',
        justificada: e === 'justificada',
      }
    })
    startTransition(async () => {
      try {
        const result = await savePresencas(turmaId, data, entries, turmaNome)
        if (result?.error) {
          setSaveError(result.error)
        } else {
          router.push('/presencas?saved=1')
        }
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Erro ao salvar. Tente novamente.')
      }
    })
  }

  const presentes    = [...estados.values()].filter((e) => e === 'presente').length
  const faltas       = [...estados.values()].filter((e) => e === 'falta').length
  const justificadas = [...estados.values()].filter((e) => e === 'justificada').length

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <Check size={15} /> {presentes} presente{presentes !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">
          <X size={15} /> {faltas} falta{faltas !== 1 ? 's' : ''}
        </span>
        {justificadas > 0 && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-500">
            <Check size={15} /> {justificadas} justificada{justificadas !== 1 ? 's' : ''}
          </span>
        )}
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
                  <p className="font-medium text-navy-500 text-sm leading-tight flex items-center gap-1.5">
                    {aluno.nome}
                    {aluno.status === 'inativo' && (
                      <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Inativo
                      </span>
                    )}
                  </p>
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
      <div className="flex flex-col gap-2 pt-2">
        {saveError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={15} className="flex-shrink-0" />
            {saveError}
          </div>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 sm:flex-none bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            {isPending ? 'Salvando...' : 'Salvar presenças'}
          </button>
        </div>
      </div>

      {/* Excluir lista — só mostra se já há registros */}
      {presencasExistentes.length > 0 && (
        <div className="pt-2 mt-2 border-t border-gray-100">
          <DeletePresencaButton
            turmaId={turmaId}
            data={data}
            turmaNome={turmaNome}
            onSuccess={() => router.push('/presencas')}
            variant="full"
          />
        </div>
      )}

      {alunos.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <AlertCircle size={16} />
          Nenhum(a) atleta cadastrado(a) nesta turma.
        </div>
      )}
    </div>
  )
}
