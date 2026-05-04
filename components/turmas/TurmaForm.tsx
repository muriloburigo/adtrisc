'use client'

import { useRef } from 'react'
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
  submitLabel = 'Salvar',
}: {
  action: (formData: FormData) => Promise<void>
  turma?: Turma
  coaches: Coach[]
  submitLabel?: string
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={action} className="space-y-6">
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
          label="Capacidade (alunos)"
          name="capacidade"
          type="number"
          min="1"
          defaultValue={turma?.capacidade ?? 20}
          required
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

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
