import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'sky'

const variants: Record<BadgeVariant, string> = {
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-500',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-navy-100 text-navy-500',
  gray:   'bg-gray-100 text-gray-600',
  sky:    'bg-sky-100 text-sky-500',
}

export default function Badge({
  children,
  variant = 'gray',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}

export function statusAlunoVariant(status: string): BadgeVariant {
  return status === 'ativo' ? 'green' : status === 'inativo' ? 'gray' : 'red'
}

export function statusTurmaVariant(status: string): BadgeVariant {
  return status === 'ativa' ? 'green' : status === 'inativa' ? 'gray' : 'yellow'
}

export function statusPagamentoVariant(status: string): BadgeVariant {
  if (status === 'pago') return 'green'
  if (status === 'pendente') return 'yellow'
  if (status === 'atrasado') return 'red'
  return 'gray'
}
