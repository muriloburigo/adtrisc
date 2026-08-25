'use client'

import { useActionState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { Database, DiaSemana, TurmaModalidade, TurmaStatus } from '@/types/database'

type Turma = Database['public']['Tables']['turmas']['Row']
type Coach = { id: string; full_name: string | null }

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'seg', label: 'Segunda' },
  { value: 'ter', label: 'Terça' },
  { value: 'qua', label: 'Quarta' },
  { value: 'qui', label: 'Quinta' },
  { value: 'sex', label: 'Sexta' },
  { value: 'sab', label: 'Sábado' },
  { value: 'dom', label: 'Domingo' },
]

const MODALIDADES: { value: TurmaModalidade; label: string }[] = [
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'natacao',   label: 'Natação' },
  { value: 'ciclismo',  label: 'Ciclismo' },
  { value: 'corrida',   label: 'Corrida' },
]

const STATUS_OPTIONS: { value: TurmaStatus; label: string }[] = [
  { value: 'ativa',    label: 'Ativa' },
  { value: 'inativa',  label: 'Inativa' },
  { value: 'suspensa', label: 'Suspensa' },
]

export default function TurmaForm({
  action,
  turma,
  coaches,
  auxiliaryCoachIds = [],
  submitLabel = 'Salvar',
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  turma?: Turma
  coaches: Coach[]
  auxiliaryCoachIds?: string[]
  submitLabel?: string
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | void, formData: FormData) => action(formData),
    undefined,
  )

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Nome da turma"
            name="nome"
            defaultValue={turma?.nome}
            placeholder="Ex: Turma 1 — Matutino"
            required
          />
        </div>

        <Select
          label="Modalidade"
          name="modalidade"
          defaultValue={turma?.modalidade ?? 'triathlon'}
          options={MODALIDADES}
          required
        />

        <Select
          label="Treinador(a) responsável"
          name="coach_id"
          defaultValue={turma?.coach_id ?? ''}
          placeholder="Selecione..."
          options={coaches.map((c) => ({ value: c.id, label: c.full_name ?? c.id }))}
        />

        <Input
          label="Horário de início"
          name="horario_inicio"
          type="time"
          defaultValue={turma?.horario_inicio?.slice(0, 5)}
          required
        />

        <Input
          label="Horário de término"
          name="horario_fim"
          type="time"
          defaultValue={turma?.horario_fim?.slice(0, 5)}
          required
        />

        <Input
          label="Capacidade (atletas)"
          name="capacidade"
          type="number"
          min="1"
          defaultValue={turma?.capacidade ?? 20}
          required
        />

        <Input
          label="Ano"
          name="ano"
          type="number"
          min="2020"
          max="2100"
          defaultValue={turma?.ano ?? new Date().getFullYear()}
        />

        <Select
          label="Semestre"
          name="semestre"
          defaultValue={turma?.semestre?.toString() ?? ''}
          placeholder="Selecione..."
          options={[
            { value: '1', label: '1º Semestre' },
            { value: '2', label: '2º Semestre' },
          ]}
        />

        <Input
          label="Idade mínima"
          name="idade_min"
          type="number"
          min="3"
          max="99"
          placeholder="Ex: 8"
          defaultValue={turma?.idade_min ?? ''}
          hint="anos"
        />

        <Input
          label="Idade máxima"
          name="idade_max"
          type="number"
          min="3"
          max="99"
          placeholder="Ex: 9"
          defaultValue={turma?.idade_max ?? ''}
          hint="anos"
        />

        {turma && (
          <Select
            label="Status"
            name="status"
            defaultValue={turma.status}
            options={STATUS_OPTIONS}
            required
          />
        )}
      </div>

      {/* Treinadores auxiliares */}
      {coaches.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Treinadores auxiliares <span className="text-gray-400 font-normal">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {coaches.map((c) => (
              <label key={c.id} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="coach_ids"
                  value={c.id}
                  defaultChecked={auxiliaryCoachIds.includes(c.id)}
                  className="sr-only peer"
                />
                <span className={cn(
                  'inline-flex px-3 py-1.5 rounded-full text-xs font-medium border transition-colors select-none',
                  'border-gray-300 text-gray-600',
                  'peer-checked:bg-sky-400 peer-checked:text-white peer-checked:border-sky-400'
                )}>
                  {c.full_name ?? c.id}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Dias da semana */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Dias da semana <span className="text-brand-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => (
            <label key={dia.value} className="cursor-pointer">
              <input
                type="checkbox"
                name="dias_semana"
                value={dia.value}
                defaultChecked={turma?.dias_semana?.includes(dia.value)}
                className="sr-only peer"
              />
              <span className={cn(
                'inline-flex px-3 py-1.5 rounded-full text-xs font-medium border transition-colors select-none',
                'border-gray-300 text-gray-600',
                'peer-checked:bg-sky-400 peer-checked:text-white peer-checked:border-sky-400'
              )}>
                {dia.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Observações */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Observações</label>
        <textarea
          name="observacoes"
          defaultValue={turma?.observacoes ?? ''}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          placeholder="Informações adicionais sobre a turma..."
        />
      </div>

      {/* Captação */}
      <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
        <input
          type="checkbox"
          id="captacao_aberta"
          name="captacao_aberta"
          value="true"
          defaultChecked={turma?.captacao_aberta ?? false}
          className="mt-0.5 w-4 h-4 accent-sky-400"
        />
        <label htmlFor="captacao_aberta" className="text-sm text-gray-700">
          <span className="font-medium">Abrir para captação de atletas</span>
          <br />
          <span className="text-xs text-gray-400">Quando marcado, esta turma aparecerá no formulário público de inscrição para sorteio.</span>
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
