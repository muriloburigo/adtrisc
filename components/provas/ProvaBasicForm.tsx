'use client'

import { useActionState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { ProvaRow } from '@/types/database'

export default function ProvaBasicForm({
  action,
  prova,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  prova: ProvaRow
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | void, formData: FormData) => action(formData),
    undefined,
  )

  return (
    <form action={formAction} className="space-y-4">
      <Input label="Nome da prova" name="nome" defaultValue={prova.nome} required />
      <Input label="Local" name="local" defaultValue={prova.local} required />
      <Input label="Data" name="data" type="date" defaultValue={prova.data} required />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Observações</label>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={prova.observacoes ?? ''}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : 'Salvar'}</Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
