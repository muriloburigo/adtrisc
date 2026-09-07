'use client'

import { useActionState, useState } from 'react'
import { Plus, X } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { ETAPA_MODALIDADE_OPTIONS } from '@/lib/provas'
import type { EtapaModalidade } from '@/types/database'

type EtapaState = { modalidade: EtapaModalidade; distancia_metros: string }
type CategoriaState = { nome: string; idade_min: string; idade_max: string; etapas: EtapaState[] }

function novaCategoria(): CategoriaState {
  return { nome: '', idade_min: '', idade_max: '', etapas: [{ modalidade: 'corrida', distancia_metros: '' }] }
}

export default function ProvaForm({
  action,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | void, formData: FormData) => action(formData),
    undefined,
  )
  const [categorias, setCategorias] = useState<CategoriaState[]>([novaCategoria()])

  function updateCategoria(i: number, patch: Partial<CategoriaState>) {
    setCategorias((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  function updateEtapa(ci: number, ei: number, patch: Partial<EtapaState>) {
    setCategorias((prev) =>
      prev.map((c, idx) =>
        idx === ci ? { ...c, etapas: c.etapas.map((e, j) => (j === ei ? { ...e, ...patch } : e)) } : c,
      ),
    )
  }

  const categoriasJson = JSON.stringify(
    categorias
      .filter((c) => c.nome.trim())
      .map((c) => ({
        nome: c.nome.trim(),
        idade_min: c.idade_min ? Number(c.idade_min) : null,
        idade_max: c.idade_max ? Number(c.idade_max) : null,
        etapas: c.etapas
          .filter((e) => e.distancia_metros)
          .map((e) => ({ modalidade: e.modalidade, distancia_metros: Number(e.distancia_metros) })),
      })),
  )

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="categorias_json" value={categoriasJson} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input
            label="Nome da prova"
            name="nome"
            placeholder="Ex: Duathlon São José — Troféu Felipe Manente"
            required
          />
        </div>
        <Input label="Local" name="local" placeholder="Ex: Multi Uso — Beira Mar de São José" required />
        <Input label="Data" name="data" type="date" required />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          placeholder="Regulamento, horários de largada, informações adicionais..."
        />
      </div>

      {/* Categorias */}
      <div>
        <p className="text-sm font-semibold text-navy-500 mb-3">Categorias por faixa etária</p>
        <div className="space-y-4">
          {categorias.map((cat, ci) => (
            <div key={ci} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                  <Input
                    label="Categoria"
                    placeholder="Ex: 8/9 anos"
                    value={cat.nome}
                    onChange={(e) => updateCategoria(ci, { nome: e.target.value })}
                  />
                  <Input
                    label="Idade mínima"
                    type="number"
                    min="0"
                    value={cat.idade_min}
                    onChange={(e) => updateCategoria(ci, { idade_min: e.target.value })}
                  />
                  <Input
                    label="Idade máxima"
                    type="number"
                    min="0"
                    value={cat.idade_max}
                    onChange={(e) => updateCategoria(ci, { idade_max: e.target.value })}
                  />
                </div>
                {categorias.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCategorias((prev) => prev.filter((_, idx) => idx !== ci))}
                    className="mt-6 text-gray-300 hover:text-red-500 transition-colors p-1"
                    title="Remover categoria"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Etapas (na ordem de disputa)
                </p>
                {cat.etapas.map((etapa, ei) => (
                  <div key={ei} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-4">{ei + 1}.</span>
                    <Select
                      className="w-40"
                      options={ETAPA_MODALIDADE_OPTIONS}
                      value={etapa.modalidade}
                      onChange={(e) => updateEtapa(ci, ei, { modalidade: e.target.value as EtapaModalidade })}
                    />
                    <Input
                      className="w-32"
                      type="number"
                      min="0"
                      placeholder="Distância"
                      value={etapa.distancia_metros}
                      onChange={(e) => updateEtapa(ci, ei, { distancia_metros: e.target.value })}
                    />
                    <span className="text-xs text-gray-400">metros</span>
                    {cat.etapas.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateCategoria(ci, { etapas: cat.etapas.filter((_, j) => j !== ei) })
                        }
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateCategoria(ci, {
                      etapas: [...cat.etapas, { modalidade: 'corrida', distancia_metros: '' }],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium"
                >
                  <Plus size={13} /> Adicionar etapa
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCategorias((prev) => [...prev, novaCategoria()])}
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-600 font-medium"
        >
          <Plus size={15} /> Adicionar categoria
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : 'Criar prova'}</Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
