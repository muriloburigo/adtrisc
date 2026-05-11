'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export default function BackButton({ fallback = '/dashboard' }: { fallback?: string }) {
  const router = useRouter()

  const handleBack = () => {
    // Tenta voltar no histórico. 
    // Em navegadores modernos, se não houver histórico da mesma origem, 
    // o router.back() pode não fazer nada ou sair do site.
    // O ideal é que o Next.js gerencie isso, mas podemos reforçar.
    router.back()
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-sky-500 transition-colors mb-4 -ml-1 cursor-pointer"
    >
      <ChevronLeft size={16} />
      Voltar
    </button>
  )
}
