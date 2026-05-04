'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { PASSWORD_REQUIREMENTS } from '@/lib/password'

interface Props {
  name: string
  label?: string
  placeholder?: string
  required?: boolean
}

const STRENGTH_CONFIG = [
  { color: 'bg-red-400',     text: 'text-red-500',     label: 'Muito fraca' },
  { color: 'bg-red-400',     text: 'text-red-500',     label: 'Fraca'       },
  { color: 'bg-amber-400',   text: 'text-amber-500',   label: 'Média'       },
  { color: 'bg-sky-400',     text: 'text-sky-500',     label: 'Boa'         },
  { color: 'bg-emerald-400', text: 'text-emerald-500', label: 'Forte'       },
]

export default function PasswordInput({
  name,
  label = 'Senha',
  placeholder = '••••••••',
  required,
}: Props) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = PASSWORD_REQUIREMENTS.map(r => r.test(value))
  const score   = results.filter(Boolean).length
  const allMet  = score === PASSWORD_REQUIREMENTS.length
  const cfg     = STRENGTH_CONFIG[Math.max(0, score - 1)] ?? STRENGTH_CONFIG[0]

  // Prevent native form submission when requirements aren't met
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.setCustomValidity(
      value.length > 0 && !allMet ? 'A senha não atende todos os requisitos.' : ''
    )
  }, [value, allMet])

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Input + eye toggle */}
      <div className="relative">
        <input
          ref={inputRef}
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete="new-password"
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Strength meter + checklist — only shown once user starts typing */}
      {value.length > 0 && (
        <div className="space-y-2 mt-0.5">
          {/* Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${cfg.color}`}
                style={{ width: `${(score / PASSWORD_REQUIREMENTS.length) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-semibold tabular-nums w-20 text-right ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>

          {/* Requirements checklist */}
          <ul className="space-y-1">
            {PASSWORD_REQUIREMENTS.map((req, i) => (
              <li
                key={i}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  results[i] ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {results[i]
                  ? <Check size={11} className="flex-shrink-0" />
                  : <X size={11} className="flex-shrink-0" />}
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
