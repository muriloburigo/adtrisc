'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarRegistroAula, atualizarRegistroAula } from './actions'

export const MODALIDADES = [
  { value: 'corrida',  label: 'Corrida' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'natacao',  label: 'Natação' },
]

type TurmaBasic = { id: string; nome: string }

type DefaultValues = {
  data: string
  modalidade: string
  objetivo: string
  observacoes: string
  turmas: Array<{ turma_id: string; descricao: string | null }>
}

export default function DiarioAulaForm({
  turmas,
  registroId,
  defaultValues,
  targetCoachId,
  prefilledDate,
}: {
  turmas: TurmaBasic[]
  registroId?: string
  defaultValues?: DefaultValues
  targetCoachId?: string
  prefilledDate?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [data, setData]             = useState(defaultValues?.data ?? prefilledDate ?? '')
  const [modalidade, setModalidade] = useState(defaultValues?.modalidade ?? 'corrida')
  const [objetivo, setObjetivo]     = useState(defaultValues?.objetivo ?? '')
  const [observacoes, setObs]       = useState(defaultValues?.observacoes ?? '')

  const attendedIds = new Set(defaultValues?.turmas?.map((t) => t.turma_id) ?? turmas.map((t) => t.id))

  const [attended, setAttended] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      turmas.map((t) => [t.id, defaultValues ? attendedIds.has(t.id) : true])
    )
  )

  function toggleAttended(turmaId: string) {
    setAttended((prev) => ({ ...prev, [turmaId]: !prev[turmaId] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const turmasPayload = Object.entries(attended)
      .filter(([, a]) => a)
      .map(([turmaId]) => ({ turma_id: turmaId, descricao: '' }))

    startTransition(async () => {
      try {
        if (registroId) {
          await atualizarRegistroAula(registroId, { data, modalidade, objetivo, observacoes, turmas: turmasPayload })
        } else {
          await criarRegistroAula({ data, modalidade, objetivo, observacoes, turmas: turmasPayload, targetCoachId })
        }
        router.push('/diario')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Turmas */}
      <div>
        <p className={labelCls}>Turmas atendidas</p>
        <div className="flex flex-wrap gap-3">
          {turmas.map((turma) => (
            <label
              key={turma.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors text-sm font-semibold select-none ${
                attended[turma.id]
                  ? 'bg-sky-50 border-sky-300 text-sky-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={attended[turma.id] ?? false}
                onChange={() => toggleAttended(turma.id)}
                className="w-4 h-4 accent-sky-400"
              />
              {turma.nome}
            </label>
          ))}
        </div>
      </div>

      {/* Data + Modalidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Data da aula</label>
          <input
            type="date"
            required
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Modalidade</label>
          <select
            required
            value={modalidade}
            onChange={(e) => setModalidade(e.target.value)}
            className={inputCls}
          >
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Descrição do treino */}
      <div>
        <label className={labelCls}>Descrição do treino</label>
        <textarea
          rows={4}
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder="Descreva as atividades realizadas no treino..."
          className={`${inputCls} resize-y`}
        />
      </div>

      {/* Observações */}
      <div>
        <label className={labelCls}>Observações / Intercorrências</label>
        <textarea
          rows={2}
          value={observacoes}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: Aula realizada normalmente. Em caso de cancelamento, registre aqui."
          className={`${inputCls} resize-y`}
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/diario')}
          className="flex-1 border border-gray-200 hover:border-gray-300 text-gray-600 font-semibold text-sm py-3 rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || !data}
          className="flex-1 bg-sky-400 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
        >
          {isPending ? 'Salvando...' : registroId ? 'Salvar alterações' : 'Registrar aula'}
        </button>
      </div>
    </form>
  )
}
