'use client'

import { useOptimistic, useTransition } from 'react'
import { saveAvaliacaoField } from '../../actions'
import type { AvaliacaoFisicaRow } from '@/types/database'

type AlunoBasic = { id: string; nome: string }

const CAMPOS: { key: keyof AvaliacaoFisicaRow; label: string; unit: string; step: string }[] = [
  { key: 'massa_corporal',    label: 'Massa (kg)',      unit: 'kg', step: '0.1' },
  { key: 'estatura',          label: 'Estatura (m)',    unit: 'm',  step: '0.01' },
  { key: 'resistencia_6min',  label: 'Resist. 6\' (m)', unit: 'm',  step: '1'   },
  { key: 'forca_abdominal',   label: 'Abd. (rep)',      unit: '',   step: '1'   },
  { key: 'envergadura',       label: 'Enverg. (cm)',    unit: 'cm', step: '0.1' },
  { key: 'impulsao_vertical', label: 'Impulsão (cm)',   unit: 'cm', step: '0.1' },
  { key: 'velocidade_20m',    label: 'Vel. 20m (s)',    unit: 's',  step: '0.01'},
  { key: 'flexibilidade',     label: 'Flex. (cm)',      unit: 'cm', step: '0.1' },
]

function CellInput({
  alunoId,
  data,
  field,
  initialValue,
}: {
  alunoId: string
  data: string
  field: keyof AvaliacaoFisicaRow
  initialValue: number | null | undefined
  step: string
}) {
  const [, startTransition] = useTransition()

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value
    startTransition(() => saveAvaliacaoField(alunoId, data, field as string, val))
  }

  return (
    <input
      type="number"
      step="any"
      defaultValue={initialValue ?? ''}
      onBlur={handleBlur}
      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
      placeholder="—"
    />
  )
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
  if (alunos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-gray-400 text-sm">
        Nenhum atleta ativo nesta turma
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Mobile: card por atleta */}
      <div className="md:hidden divide-y divide-gray-100">
        {alunos.map((a) => {
          const av = avaliacaoMap[a.id] ?? {}
          return (
            <div key={a.id} className="px-4 py-4">
              <p className="font-semibold text-navy-500 text-sm mb-3">{a.nome}</p>
              <div className="grid grid-cols-2 gap-3">
                {CAMPOS.map((c) => (
                  <div key={c.key}>
                    <label className="block text-[10px] text-gray-400 font-medium mb-1">{c.label}</label>
                    <CellInput
                      alunoId={a.id}
                      data={data}
                      field={c.key}
                      initialValue={av[c.key] as number | null}
                      step={c.step}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 bg-gray-50 text-left px-4 py-3 text-gray-500 font-medium min-w-[180px]">
                Atleta
              </th>
              {CAMPOS.map((c) => (
                <th key={c.key} className="text-center px-3 py-3 text-gray-500 font-medium whitespace-nowrap text-xs min-w-[100px]">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alunos.map((a) => {
              const av = avaliacaoMap[a.id] ?? {}
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-navy-500 truncate max-w-[180px]">
                    {a.nome}
                  </td>
                  {CAMPOS.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      <CellInput
                        alunoId={a.id}
                        data={data}
                        field={c.key}
                        initialValue={av[c.key] as number | null}
                        step={c.step}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
