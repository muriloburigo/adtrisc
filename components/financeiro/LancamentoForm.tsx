'use client'

import { useActionState, useState } from 'react'
import { Upload, FileCheck2 } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { NOTA_FISCAL_ACCEPT } from '@/lib/financeiro'

type Option = { value: string; label: string }

export default function LancamentoForm({
  action,
  projetos,
  categorias,
  coaches,
  arquivoAtual,
  initial,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  projetos: Option[]
  categorias: Option[]
  coaches?: Option[]
  arquivoAtual?: string | null
  initial?: {
    projeto_id: string
    categoria_id: string
    valor: string
    descricao: string
    numero_nota: string
    data: string
    coach_id?: string
  }
}) {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string } | void, formData: FormData) => action(formData),
    undefined,
  )
  const [fileName, setFileName] = useState<string | null>(null)

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select label="Projeto" name="projeto_id" options={projetos} placeholder="Selecione o projeto" defaultValue={initial?.projeto_id} required />
        <Select label="Categoria" name="categoria_id" options={categorias} placeholder="Selecione a categoria" defaultValue={initial?.categoria_id} required />
      </div>

      {coaches && (
        <Select label="Lançado por" name="coach_id" options={coaches} placeholder="Selecione o treinador" defaultValue={initial?.coach_id} required />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Valor (R$)" name="valor" type="number" step="0.01" min="0.01" defaultValue={initial?.valor} required />
        <Input label="Data da nota" name="data" type="date" defaultValue={initial?.data} required />
      </div>

      <Input label="Descrição" name="descricao" placeholder="Ex: Uniformes do time sub-14" defaultValue={initial?.descricao} required />
      <Input label="Número da nota (opcional)" name="numero_nota" defaultValue={initial?.numero_nota} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Anexo da nota (opcional)</label>
        <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-500 cursor-pointer hover:border-sky-400 transition-colors">
          {fileName ? <FileCheck2 size={16} className="text-emerald-500 flex-shrink-0" /> : <Upload size={16} className="text-gray-400 flex-shrink-0" />}
          <span className="truncate">{fileName ?? arquivoAtual ?? 'PDF, JPG, PNG ou WebP — máx 10 MB'}</span>
          <input
            type="file"
            name="arquivo"
            accept={NOTA_FISCAL_ACCEPT}
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-brand-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : 'Salvar'}</Button>
      </div>
    </form>
  )
}
