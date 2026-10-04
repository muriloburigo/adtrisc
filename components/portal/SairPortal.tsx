'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SairPortal({ escuro = false }: { escuro?: boolean }) {
  const router = useRouter()
  return (
    <button
      onClick={async () => { await createClient().auth.signOut(); router.push('/login'); router.refresh() }}
      className={`inline-flex items-center gap-1.5 text-sm rounded-lg px-2.5 py-1.5 ${escuro ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
      <LogOut size={16} /> <span className={escuro ? 'hidden sm:inline' : ''}>Sair</span>
    </button>
  )
}
