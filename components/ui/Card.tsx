import { cn } from '@/lib/utils'

export default function Card({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200', padding && 'p-5', className)}>
      {children}
    </div>
  )
}
