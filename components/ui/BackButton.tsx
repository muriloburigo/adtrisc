'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-sky-500 transition-colors mb-4 -ml-1"
    >
      <ChevronLeft size={16} />
      Voltar
    </button>
  )
}
