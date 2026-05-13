import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export default function Select({
  label, error, options, placeholder, className, id, ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-brand-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent',
          error && 'border-brand-red-500 focus:ring-brand-red-500',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-brand-red-500">{error}</p>}
    </div>
  )
}
