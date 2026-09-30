'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCheck,
  LogOut, KeyRound, Users2, Settings, ClipboardCheck, Dumbbell, ListFilter, UserPlus, ScrollText, BookOpen, Trophy, Newspaper, Wallet,
} from 'lucide-react'
import { cn, formatRole } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Database, UserRole } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

const navGroups: { label: string | null; items: { href: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] }[] = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin','coach','aluno','pai'] },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/turmas',     label: 'Turmas',          icon: Users2,         roles: ['admin','coach'] },
      { href: '/alunos',     label: 'Atletas',         icon: Users,          roles: ['admin','coach'] },
      { href: '/presencas',  label: 'Presenças',       icon: ClipboardCheck, roles: ['admin','coach'] },
      { href: '/diario',     label: 'Diário de Aulas', icon: BookOpen,       roles: ['admin','coach'] },
      { href: '/avaliacoes', label: 'Avaliações',      icon: Dumbbell,       roles: ['admin','coach'] },
      { href: '/relatorios', label: 'Relatórios',      icon: ListFilter,     roles: ['admin','coach'] },
    ],
  },
  {
    label: 'Competições & Comunicação',
    items: [
      { href: '/provas',     label: 'Provas',      icon: Trophy,    roles: ['admin','coach'] },
      { href: '/imprensa',   label: 'Imprensa',    icon: Newspaper, roles: ['admin','coach'] },
      { href: '/candidatos', label: 'Candidatos',  icon: UserPlus,  roles: ['admin','coach'] },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { href: '/financeiro', label: 'Financeiro', icon: Wallet, roles: ['admin','coach'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { href: '/coaches',       label: 'Treinadores',   icon: UserCheck,  roles: ['admin'] },
      { href: '/auditoria',     label: 'Auditoria',     icon: ScrollText, roles: ['admin'] },
      { href: '/configuracoes', label: 'Configurações', icon: Settings,   roles: ['admin'] },
    ],
  },
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

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0)

  return (
    <aside className="hidden md:flex print:hidden w-60 bg-navy-500 flex-col h-full flex-shrink-0">
      {/* Logo */}
      <Link href="/dashboard" className="px-5 py-5 border-b border-navy-600 flex items-center gap-3 hover:bg-navy-600 transition-colors">
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
          <p className="text-sky-400 text-xs mt-0.5 leading-tight">Associação Desportiva Triatlética<br />de Santa Catarina</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`}>
            {group.label && (
              <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wide text-navy-100/40">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
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
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-navy-600">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-white truncate">{user?.full_name ?? 'Usuário'}</p>
          <p className="text-xs text-sky-400">{user?.role ? formatRole(user.role) : ''}</p>
        </div>
        <Link
          href="/conta"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
            pathname === '/conta' ? 'bg-navy-600 text-white' : 'text-navy-100 hover:bg-navy-600 hover:text-white'
          }`}
        >
          <KeyRound size={17} />
          Minha conta
        </Link>
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
