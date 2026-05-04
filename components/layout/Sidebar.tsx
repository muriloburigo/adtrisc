'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCheck,
  LogOut, Users2, Settings, ClipboardCheck, Dumbbell,
} from 'lucide-react'
import { cn, formatRole } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Database, UserRole } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

const nav = [
  { href: '/dashboard',      label: 'Dashboard',     icon: LayoutDashboard, roles: ['admin','coach','aluno','pai'] as UserRole[] },
  { href: '/turmas',         label: 'Turmas',         icon: Users2,          roles: ['admin','coach'] as UserRole[] },
  { href: '/alunos',         label: 'Atletas',        icon: Users,           roles: ['admin','coach'] as UserRole[] },
  { href: '/presencas',      label: 'Presenças',      icon: ClipboardCheck,  roles: ['admin','coach'] as UserRole[] },
  { href: '/avaliacoes',     label: 'Avaliações',     icon: Dumbbell,        roles: ['admin','coach'] as UserRole[] },
  { href: '/coaches',        label: 'Treinadores',    icon: UserCheck,       roles: ['admin'] as UserRole[] },
  { href: '/configuracoes',  label: 'Configurações',  icon: Settings,        roles: ['admin'] as UserRole[] },
]

export default function Sidebar({ user }: { user: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const role = (user?.role ?? 'aluno') as UserRole

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNav = nav.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-60 bg-navy-500 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-600 flex items-center gap-3">
        <div className="w-9 h-9 flex-shrink-0 bg-white rounded-lg overflow-hidden flex items-center justify-center">
          <Image
            src="/logo-white.jpg"
            alt="ADTRISC"
            width={36}
            height={36}
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-none">ADTRISC</h1>
          <p className="text-sky-400 text-xs mt-0.5">Escolinha de Triathlon</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-sky-400 text-white'
                  : 'text-navy-100 hover:bg-navy-600 hover:text-white'
              )}
            >
              <Icon size={17} />
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
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-navy-100 hover:bg-brand-red-500 hover:text-white w-full transition-colors"
        >
          <LogOut size={17} />
          Sair
        </button>
      </div>
    </aside>
  )
}
