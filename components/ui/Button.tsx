import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        variant === 'primary'   && 'bg-navy-500 text-white hover:bg-navy-600',
        variant === 'secondary' && 'bg-white text-navy-500 border border-gray-200 hover:bg-gray-50',
        variant === 'danger'    && 'bg-red-500 text-white hover:bg-red-600',
        variant === 'ghost'     && 'text-gray-600 hover:bg-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
