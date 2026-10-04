import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, Gauge, UserCircle } from 'lucide-react'
import { atletaLogado } from '@/lib/portalAtleta'
import SairPortal from '@/components/portal/SairPortal'

// Portal do atleta: pensado primeiro para o celular (barra de navegação embaixo).
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { atleta } = await atletaLogado()

  if (!atleta) {
    return (
      <div className="min-h-[100svh] flex flex-col items-center justify-center gap-4 p-6 text-center bg-gray-50">
        <Image src="/logo.png" alt="ADTRISC" width={48} height={48} className="rounded-xl" />
        <h1 className="text-lg font-bold text-navy-500">Acesso desativado</h1>
        <p className="text-sm text-gray-500 max-w-xs">Seu cadastro não está ativo na ADTRISC. Fale com o treinador.</p>
        <SairPortal />
      </div>
    )
  }

  const nav = [
    { href: '/portal', label: 'Treinos', icon: CalendarDays },
    { href: '/portal/zonas', label: 'Zonas', icon: Gauge },
    { href: '/portal/conta', label: 'Conta', icon: UserCircle },
  ]
  return (
    <div className="min-h-[100svh] bg-gray-50 pb-20 md:pb-0">
      <header className="bg-navy-500 text-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Image src="/logo.png" alt="ADTRISC" width={30} height={30} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{atleta.aluno.nome.split(' ').slice(0, 2).join(' ')}</p>
            <p className="text-[11px] text-sky-300 truncate">{atleta.aluno.turma ?? 'ADTRISC'}</p>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => <Link key={n.href} href={n.href} className="px-3 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10">{n.label}</Link>)}
          </nav>
          <SairPortal escuro />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-4">{children}</main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 grid grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-gray-500 hover:text-navy-500">
            <n.icon size={20} /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
