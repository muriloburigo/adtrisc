'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function FinanceiroTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/financeiro', label: 'Orçamento' },
    { href: '/financeiro/notas', label: 'Notas Fiscais' },
    ...(isAdmin ? [
      { href: '/financeiro/projetos', label: 'Projetos' },
      { href: '/financeiro/categorias', label: 'Categorias' },
    ] : []),
  ]

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.href === '/financeiro'
          ? pathname === '/financeiro'
          : pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              active
                ? 'border-sky-400 text-navy-500'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
