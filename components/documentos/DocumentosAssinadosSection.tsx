'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload, X, Trash2, Download } from 'lucide-react'
import { uploadDocumentoAssinado, deleteDocumentoAssinado } from '@/lib/documentosAssinados'
import { formatDate } from '@/lib/utils'
import type { DocumentoAssinadoTipo } from '@/types/database'

export type DocumentoAssinadoItem = {
  id: string
  nomeArquivo: string
  storagePath: string
  enviadoEm: string
  enviadoPorNome: string | null
  signedUrl: string | null
}

export default function DocumentosAssinadosSection({
  turmaId,
  tipo,
  periodo,
  documentos,
}: {
  turmaId: string
  tipo: DocumentoAssinadoTipo
  periodo: string
  documentos: DocumentoAssinadoItem[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setError(null)
    const fd = new FormData(formRef.current)
    fd.set('turma_id', turmaId)
    fd.set('tipo', tipo)
    fd.set('periodo', periodo)
    startTransition(async () => {
      const result = await uploadDocumentoAssinado(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      setOpen(false)
      formRef.current?.reset()
    })
  }

  function handleDelete(id: string, storagePath: string) {
    if (!confirm('Excluir este documento?')) return
    startTransition(async () => {
      await deleteDocumentoAssinado(id, storagePath, turmaId)
    })
  }

  return (
    <div className="print:hidden border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-navy-500">Documentos assinados</h3>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-400 hover:bg-sky-500 px-3 py-2 rounded-lg transition-colors"
        >
          <Upload size={13} /> Enviar documento
        </button>
      </div>

      {documentos.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum documento assinado enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-navy-500 truncate">{doc.nomeArquivo}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(doc.enviadoEm)}
                    {doc.enviadoPorNome ? ` · ${doc.enviadoPorNome}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.signedUrl && (
                  <a
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 px-2 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
                  >
                    <Download size={13} /> Baixar
                  </a>
                )}
                <button
                  disabled={pending}
                  onClick={() => handleDelete(doc.id, doc.storagePath)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-navy-500">Enviar documento assinado</h2>
              <button onClick={() => { setOpen(false); setError(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Arquivo PDF assinado
                </label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-sky-400 transition-colors">
                  <Upload size={20} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Clique para selecionar (PDF, máx 10 MB)</span>
                  <input name="file" type="file" accept="application/pdf" required className="hidden" />
                </label>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setError(null) }}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-sky-400 hover:bg-sky-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {pending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
