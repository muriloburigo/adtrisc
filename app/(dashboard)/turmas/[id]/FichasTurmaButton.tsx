'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { FileText, Link as LinkIcon, Check, MessageCircle, Mail, ChevronDown, X } from 'lucide-react'
import { criarFichasTurma } from '@/app/(dashboard)/fichas/actions'

type Item = {
  alunoId: string; nome: string; token: string; url: string
  telefone: string | null; email: string | null; novo: boolean
}

function toWaNumber(p: string) {
  const d = p.replace(/\D/g, '')
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}
function waUrl(phone: string, url: string) {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(`Olá! Segue o link para preencher a ficha de inscrição digital da ADTRISC:\n${url}`)}`
}
function emailUrl(email: string, url: string) {
  return `mailto:${email}?subject=${encodeURIComponent('Ficha de Inscrição - ADTRISC')}&body=${encodeURIComponent(`Olá!\n\nSegue o link para preencher a ficha de inscrição digital da ADTRISC:\n\n${url}\n\nQualquer dúvida, entre em contato conosco.`)}`
}

function Panel({ results, novos, copiedId, onCopy, onClose }: {
  results: Item[]; novos: number; copiedId: string | null
  onCopy: (url: string, id: string) => void; onClose: () => void
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-600">
          {novos > 0 ? `${novos} novo${novos !== 1 ? 's' : ''} · ` : ''}
          {results.length} atleta{results.length !== 1 ? 's' : ''} com ficha pendente
        </p>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors ml-2">
          <X size={14} />
        </button>
      </div>
      {/* List */}
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {results.map(r => (
          <div key={r.alunoId} className="flex items-center justify-between px-4 py-2.5 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {r.novo && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">novo</span>
              )}
              <span className="text-sm text-navy-500 truncate">{r.nome}</span>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button onClick={() => onCopy(r.url, r.alunoId)} title="Copiar link"
                className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors">
                {copiedId === r.alunoId ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
              </button>
              {r.telefone && (
                <a href={waUrl(r.telefone, r.url)} target="_blank" rel="noopener noreferrer" title="WhatsApp"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors">
                  <MessageCircle size={14} />
                </a>
              )}
              {r.email && (
                <a href={emailUrl(r.email, r.url)} title="E-mail"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors">
                  <Mail size={14} />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function FichasTurmaButton({ turmaId, initialResults }: { turmaId: string; initialResults?: Item[] }) {
  const [results, setResults] = useState<Item[] | null>(
    initialResults && initialResults.length > 0 ? initialResults : null
  )
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function copy(text: string, id: string) {
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea')
      el.value = text; document.body.appendChild(el); el.select()
      document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleGerar() {
    setError(null)
    startTransition(async () => {
      const res = await criarFichasTurma(turmaId)
      if (res.error) { setError(res.error); return }
      setResults(res.results ?? [])
      setOpen(true)
    })
  }

  const novos = results?.filter(r => r.novo).length ?? 0

  return (
    <>
      {/* Mobile bottom-sheet backdrop */}
      {results && open && (
        <div className="sm:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setOpen(false)} />
      )}

      <div className="relative" ref={ref}>
        <button
          onClick={results ? () => setOpen(!open) : handleGerar}
          disabled={isPending}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 hover:border-sky-400 hover:text-sky-500 text-navy-500 transition-colors disabled:opacity-50"
        >
          <FileText size={15} />
          {isPending ? 'Gerando...' : results
            ? <><span>Fichas ({results.length})</span><ChevronDown size={13} /></>
            : 'Gerar fichas'}
        </button>

        {error && <p className="absolute left-0 top-full mt-1 text-xs text-red-500 whitespace-nowrap">{error}</p>}

        {results && open && (
          <>
            {/* Mobile: bottom sheet (fixed, full-width, above backdrop) */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-2xl shadow-xl overflow-hidden">
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-8 h-1 rounded-full bg-gray-300" />
              </div>
              <Panel results={results} novos={novos} copiedId={copiedId} onCopy={copy} onClose={() => setOpen(false)} />
            </div>

            {/* Desktop: floating dropdown */}
            <div className="hidden sm:block absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              <Panel results={results} novos={novos} copiedId={copiedId} onCopy={copy} onClose={() => setOpen(false)} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
