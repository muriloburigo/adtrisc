'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload, Download } from 'lucide-react'
import { uploadProjetoArquivo, deleteProjetoArquivo } from '@/app/(dashboard)/financeiro/actions'
import { formatDate } from '@/lib/utils'
import { NOTA_FISCAL_ACCEPT } from '@/lib/financeiro'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'

export type ProjetoArquivoItem = {
  id: string
  nomeArquivo: string
  storagePath: string
  createdAt: string
  signedUrl: string | null
}

export default function ProjetoArquivosSection({
  projetoId,
  arquivos,
}: {
  projetoId: string
  arquivos: ProjetoArquivoItem[]
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.set('arquivo', file)
    startTransition(async () => {
      const result = await uploadProjetoArquivo(projetoId, fd)
      if (result?.error) setError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-navy-500">Anexos do projeto</p>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-400 hover:bg-sky-500 px-3 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
          <Upload size={13} /> {isPending ? 'Enviando…' : 'Enviar arquivo'}
          <input ref={fileInputRef} type="file" accept={NOTA_FISCAL_ACCEPT} className="hidden" disabled={isPending} onChange={handleFileChange} />
        </label>
      </div>

      {error && <p className="text-xs text-brand-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>}

      {arquivos.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum anexo enviado ainda (plano de trabalho, convênio, edital...).</p>
      ) : (
        <div className="space-y-2">
          {arquivos.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={16} className="text-gray-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-navy-500 truncate">{a.nomeArquivo}</p>
                  <p className="text-xs text-gray-400">{formatDate(a.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {a.signedUrl && (
                  <a href={a.signedUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 px-2 py-1.5 rounded-lg hover:bg-sky-50 transition-colors">
                    <Download size={13} /> Baixar
                  </a>
                )}
                <ConfirmDeleteButton title="Excluir" action={() => deleteProjetoArquivo(a.id, a.storagePath, projetoId)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
