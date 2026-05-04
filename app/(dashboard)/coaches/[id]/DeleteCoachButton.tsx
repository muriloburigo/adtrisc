'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'
import { deleteCoach } from '../actions'

export default function DeleteCoachButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
        <span className="text-xs text-red-700 font-medium">Remover {name}?</span>
        <button
          onClick={async () => {
            setLoading(true)
            await deleteCoach(id)
          }}
          disabled={loading}
          className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {loading ? 'Removendo...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
      <Trash2 size={14} />
      Remover
    </Button>
  )
}
