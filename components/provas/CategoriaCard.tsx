'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import CategoriaFormInline from './CategoriaFormInline'
import { formatEtapas } from '@/lib/provas'
import { formatFaixaEtaria } from '@/lib/utils'
import { updateCategoria, deleteCategoria } from '@/app/(dashboard)/provas/actions'
import type { ProvaCategoriaRow } from '@/types/database'

export default function CategoriaCard({
  categoria,
  provaId,
  resultadosCount,
}: {
  categoria: ProvaCategoriaRow
  provaId: string
  resultadosCount: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <CategoriaFormInline
        action={(fd) => updateCategoria(categoria.id, provaId, fd)}
        initial={{
          nome: categoria.nome,
          idade_min: categoria.idade_min,
          idade_max: categoria.idade_max,
          etapas: categoria.etapas,
        }}
        submitLabel="Salvar categoria"
        onCancel={() => setEditing(false)}
        onSuccess={() => { setEditing(false); router.refresh() }}
      />
    )
  }

  return (
    <div className="flex items-start justify-between gap-3 border border-gray-200 rounded-xl p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-navy-500">{categoria.nome}</p>
          {formatFaixaEtaria(categoria.idade_min, categoria.idade_max) && (
            <Badge variant="sky">{formatFaixaEtaria(categoria.idade_min, categoria.idade_max)}</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{formatEtapas(categoria.etapas)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="text-gray-300 hover:text-sky-500 transition-colors p-1 rounded cursor-pointer"
          title="Editar categoria"
        >
          <Pencil size={14} />
        </button>
        <ConfirmDeleteButton
          title="Excluir categoria"
          confirmLabel={resultadosCount > 0 ? `Excluir + ${resultadosCount} result.?` : 'Excluir?'}
          action={() => deleteCategoria(categoria.id, provaId)}
          onSuccess={() => router.refresh()}
        />
      </div>
    </div>
  )
}
