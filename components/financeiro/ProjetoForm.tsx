'use client'

import { useActionState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ProjetoForm({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  initial?: { nome: string; ano: string; descricao: string; objetivo: string; metas: string; ativo: boolean }
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | void, formData: FormData) => action(formData),
    undefined,
  )

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Input label="Nome do projeto" name="nome" placeholder="Ex: Edital Municipal de Esporte" defaultValue={initial?.nome} required />
        </div>
        <Input label="Ano (competência)" name="ano" type="number" defaultValue={initial?.ano ?? String(new Date().getFullYear())} required />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Descrição (opcional)</label>
        <textarea
          name="descricao"
          rows={2}
          defaultValue={initial?.descricao}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Objetivo (opcional)</label>
          <textarea
            name="objetivo"
            rows={3}
            placeholder="O que este projeto busca alcançar"
            defaultValue={initial?.objetivo}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Metas (opcional)</label>
          <textarea
            name="metas"
            rows={3}
            placeholder="Metas mensuráveis do projeto"
            defaultValue={initial?.metas}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          />
        </div>
      </div>

      {initial && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="ativo" defaultChecked={initial.ativo} className="rounded border-gray-300" />
          Projeto ativo
        </label>
      )}

      {state?.error && (
        <p className="text-sm text-brand-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}
