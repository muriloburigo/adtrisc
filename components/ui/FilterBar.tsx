'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

type SelectOption = { value: string; label: string }
export type FilterField =
  | { type: 'search'; key: string; placeholder?: string }
  | { type: 'select'; key: string; placeholder: string; options: SelectOption[] }

interface FilterBarProps {
  fields: FilterField[]
  initialValues: Record<string, string>
}

export default function FilterBar({ fields, initialValues }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [values, setValues] = useState(initialValues)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if server re-renders with new initial values (navigation)
  useEffect(() => { setValues(initialValues) }, [JSON.stringify(initialValues)]) // eslint-disable-line react-hooks/exhaustive-deps

  function pushURL(next: Record<string, string>) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function updateSelect(key: string, value: string) {
    const next = { ...values, [key]: value }
    setValues(next)
    pushURL(next)
  }

  function updateSearch(key: string, value: string) {
    const next = { ...values, [key]: value }
    setValues(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => pushURL(next), 400)
  }

  function clearAll() {
    const empty: Record<string, string> = {}
    for (const f of fields) empty[f.key] = ''
    setValues(empty)
    router.push(pathname)
  }

  const hasAny = Object.values(values).some((v) => v !== '')

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {fields.map((field) => {
        if (field.type === 'search') {
          return (
            <div key={field.key} className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={field.placeholder ?? 'Buscar...'}
                value={values[field.key] ?? ''}
                onChange={(e) => updateSearch(field.key, e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-56 bg-white"
              />
            </div>
          )
        }
        return (
          <select
            key={field.key}
            value={values[field.key] ?? ''}
            onChange={(e) => updateSelect(field.key, e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white text-gray-600"
          >
            <option value="">{field.placeholder}</option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )
      })}
      {hasAny && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-1 py-2 transition-colors"
        >
          <X size={13} /> Limpar filtros
        </button>
      )}
    </div>
  )
}
