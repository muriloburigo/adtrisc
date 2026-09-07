'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import CategoriaFormInline from './CategoriaFormInline'
import { addCategoria } from '@/app/(dashboard)/provas/actions'

export default function AddCategoriaButton({ provaId }: { provaId: string }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  if (adding) {
    return (
      <CategoriaFormInline
        action={(fd) => addCategoria(provaId, fd)}
        submitLabel="Adicionar categoria"
        onCancel={() => setAdding(false)}
        onSuccess={() => { setAdding(false); router.refresh() }}
      />
    )
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-600 font-medium"
    >
      <Plus size={15} /> Adicionar categoria
    </button>
  )
}
