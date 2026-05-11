'use client'

import { useState, useTransition } from 'react'
import { FileText, Link as LinkIcon, Check, Plus, X, Mail, MessageCircle, Download } from 'lucide-react'
import { criarFicha, invalidarFicha } from '@/app/(dashboard)/fichas/actions'

type ResponsavelContact = { nome: string; telefone: string | null; email: string | null }

type FichaRow = {
  id: string
  token: string
  status: 'pendente' | 'preenchida' | 'expirada'
  gerado_em: string
  preenchido_em: string | null
  expires_at: string
}

const statusLabel: Record<string, string> = {
  pendente:   'Aguardando',
  preenchida: 'Preenchida',
  expirada:   'Expirada',
}

const statusStyle: Record<string, string> = {
  pendente:   'bg-yellow-100 text-yellow-700',
  preenchida: 'bg-green-100 text-green-700',
  expirada:   'bg-gray-100 text-gray-500',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toWaNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}

function buildWaUrl(phone: string, url: string) {
  const msg = encodeURIComponent(`Olá! Segue o link para preencher a ficha de inscrição digital da ADTRISC:\n${url}`)
  return `https://wa.me/${toWaNumber(phone)}?text=${msg}`
}

function buildEmailUrl(email: string, url: string) {
  const subject = encodeURIComponent('Ficha de Inscrição - ADTRISC')
  const body = encodeURIComponent(`Olá!\n\nSegue o link para preencher a ficha de inscrição digital da ADTRISC:\n\n${url}\n\nQualquer dúvida, entre em contato conosco.`)
  return `mailto:${email}?subject=${subject}&body=${body}`
}

export default function FichaSection({
  alunoId,
  fichas: initialFichas,
  responsaveis = [],
}: {
  alunoId: string
  fichas: FichaRow[]
  responsaveis?: ResponsavelContact[]
}) {
  const [fichas, setFichas] = useState(initialFichas)
  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const firstPhone = responsaveis.find(r => r.telefone)?.telefone ?? null
  const firstEmail = responsaveis.find(r => r.email)?.email ?? null

  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://adtrisc.vercel.app'

  function fichaUrl(token: string) {
    return `${base}/ficha/${token}`
  }

  async function copyToClipboard(text: string, id?: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    if (id) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } else {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleGerar() {
    setError(null)
    startTransition(async () => {
      const result = await criarFicha(alunoId)
      if (result.error) { setError(result.error); return }
      setNewUrl(result.url!)
      // Refresh list — add a placeholder; a full reload would show the real row
      window.location.reload()
    })
  }

  function handleInvalidar(fichaId: string) {
    startTransition(async () => {
      const result = await invalidarFicha(fichaId, alunoId)
      if (result.error) { setError(result.error); return }
      setFichas((prev) => prev.map((f) => f.id === fichaId ? { ...f, status: 'expirada' } : f))
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">Ficha de Inscrição Digital</h2>
      </div>

      {/* Link gerado */}
      {newUrl && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-medium text-green-700 mb-2">Link gerado! Copie e envie para o responsável:</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={newUrl}
              className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 outline-none"
            />
            <button
              onClick={() => copyToClipboard(newUrl)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{ background: copied ? '#16a34a' : '#0C143D', color: '#fff' }}
            >
              {copied ? <><Check size={13} />Copiado!</> : <><LinkIcon size={13} />Copiar</>}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      {/* Fichas existentes */}
      {fichas.length > 0 ? (
        <div className="space-y-2 mb-4">
          {fichas.map((f) => (
            <div key={f.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyle[f.status]}`}>
                      {statusLabel[f.status]}
                    </span>
                    <span className="text-[11px] text-gray-400">Gerada em {fmt(f.gerado_em)}</span>
                    {f.preenchido_em && (
                      <span className="text-[11px] text-gray-400">· Preenchida em {fmt(f.preenchido_em)}</span>
                    )}
                  </div>
                  {f.status === 'pendente' && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Expira em {fmt(f.expires_at)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                {f.status === 'preenchida' && (
                  <a
                    href={`/fichas/${f.id}/imprimir`}
                    title="Download PDF"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                  >
                    <Download size={14} />
                  </a>
                )}
                {f.status === 'pendente' && (
                  <>
                    <button
                      onClick={() => copyToClipboard(fichaUrl(f.token), f.id)}
                      title="Copiar link"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                    >
                      {copiedId === f.id ? <Check size={14} className="text-green-500" /> : <LinkIcon size={14} />}
                    </button>
                    {firstPhone && (
                      <a
                        href={buildWaUrl(firstPhone, fichaUrl(f.token))}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Enviar por WhatsApp"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {firstEmail && (
                      <a
                        href={buildEmailUrl(firstEmail, fichaUrl(f.token))}
                        title="Enviar por e-mail"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                      >
                        <Mail size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => handleInvalidar(f.id)}
                      title="Invalidar link"
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 mb-4">Nenhuma ficha gerada ainda.</p>
      )}

      <button
        onClick={handleGerar}
        disabled={isPending}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        style={{ background: '#f1f5f9', color: '#0C143D' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
      >
        <Plus size={15} />
        {isPending ? 'Gerando...' : 'Gerar novo link'}
      </button>
    </div>
  )
}
