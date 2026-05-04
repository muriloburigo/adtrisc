'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut, LayoutDashboard, Users, UserCheck, Users2, Settings, ClipboardCheck, Dumbbell, UserPlus } from 'lucide-react'
import { cn, formatRole } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Database, UserRole } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

const nav = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard, roles: ['admin','coach','aluno','pai'] as UserRole[] },
  { href: '/turmas',        label: 'Turmas',        icon: Users2,          roles: ['admin','coach'] as UserRole[] },
  { href: '/alunos',        label: 'Atletas',       icon: Users,           roles: ['admin','coach'] as UserRole[] },
  { href: '/presencas',     label: 'Presenças',     icon: ClipboardCheck,  roles: ['admin','coach'] as UserRole[] },
  { href: '/avaliacoes',    label: 'Avaliações',    icon: Dumbbell,        roles: ['admin','coach'] as UserRole[] },
  { href: '/candidatos',    label: 'Candidatos',    icon: UserPlus,        roles: ['admin','coach'] as UserRole[] },
  { href: '/coaches',       label: 'Treinadores',   icon: UserCheck,       roles: ['admin'] as UserRole[] },
  { href: '/configuracoes', label: 'Configurações', icon: Settings,        roles: ['admin'] as UserRole[] },
]

export default function MobileHeader({ user }: { user: Profile | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const role = (user?.role ?? 'aluno') as UserRole
  const visibleNav = nav.filter((item) => item.roles.includes(role))

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-500 h-14 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-md overflow-hidden flex items-center justify-center flex-shrink-0">
            <Image src="/logo-white.jpg" alt="ADTRISC" width={28} height={28} className="object-contain" />
          </div>
          <span className="text-white font-bold text-sm tracking-wide">ADTRISC</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-white p-2 -mr-1 rounded-lg hover:bg-navy-600 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-navy-500 flex flex-col shadow-2xl transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="px-5 py-5 border-b border-navy-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center">
              <Image src="/logo-white.jpg" alt="ADTRISC" width={36} height={36} className="object-contain" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">ADTRISC</h1>
              <p className="text-sky-400 text-xs mt-0.5 leading-tight">
                Associação Desportiva Triatlética<br />de Santa Catarina
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-navy-600 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-sky-400 text-white'
                    : 'text-navy-100 hover:bg-navy-600 hover:text-white'
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-navy-600">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user?.full_name ?? 'Usuário'}</p>
            <p className="text-xs text-sky-400">{user?.role ? formatRole(user.role) : ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-navy-100 hover:bg-red-500 hover:text-white w-full transition-colors"
          >
            <LogOut size={17} />
            Sair
          </button>
        </div>
      </div>
    </>
  )
}
