'use client'

import { useRef, useState, useTransition } from 'react'
import { FileText, Upload, X, Download, CheckCircle2, ShieldCheck, AlertTriangle, ExternalLink, ChevronDown } from 'lucide-react'
import { prepararEnvioDocumento, registrarDocumentoAssinado, deleteDocumentoAssinado } from '@/lib/documentosAssinados'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { lerAssinaturasPdf, rotuloAssinatura, type AssinaturaPdf } from '@/lib/pdfAssinaturas'
import type { DocumentoAssinadoTipo } from '@/types/database'

const ASSINADOR_GOVBR = 'https://assinador.iti.br'
const VALIDADOR_ITI = 'https://validar.iti.gov.br'

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function SeloAssinatura({ a }: { a: AssinaturaPdf }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      a.provedor === 'outro' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'
    }`}>
      <ShieldCheck size={11} />
      {rotuloAssinatura(a)}{a.data ? ` · ${dataHora(a.data)}` : ''}
    </span>
  )
}

// Passo a passo para assinar o PDF no assinador oficial do gov.br.
function ComoAssinarGovBr() {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mb-3">
      <button onClick={() => setAberto((v) => !v)} className="inline-flex items-center gap-1 text-xs font-medium text-sky-500 hover:text-sky-600">
        <ShieldCheck size={13} /> Como assinar no gov.br
        <ChevronDown size={13} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <ol className="mt-2 space-y-1.5 text-xs text-gray-600 list-decimal pl-5">
          <li>Clique em <strong>Imprimir / PDF</strong> e salve o relatório como PDF (com a sua assinatura desenhada, se quiser).</li>
          <li>
            Abra o{' '}
            <a href={ASSINADOR_GOVBR} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline inline-flex items-center gap-0.5">
              assinador do gov.br <ExternalLink size={11} />
            </a>{' '}
            e entre com a sua conta gov.br (nível prata ou ouro).
          </li>
          <li>Envie o PDF e arraste o selo da assinatura para o quadro <strong>“Assinatura digital gov.br”</strong> do rodapé, ao lado da sua assinatura.</li>
          <li>Confirme com o código que o gov.br manda pelo app e baixe o PDF assinado.</li>
          <li>Volte aqui e clique em <strong>Enviar documento</strong>. O sistema confere a assinatura e mostra quem assinou.</li>
        </ol>
      )}
    </div>
  )
}

export type DocumentoAssinadoItem = {
  id: string
  nomeArquivo: string
  storagePath: string
  enviadoEm: string
  enviadoPorNome: string | null
  signedUrl: string | null
  assinaturasDigitais?: AssinaturaPdf[] | null // null = enviado antes da conferência existir
}

export default function DocumentosAssinadosSection({
  turmaId,
  coachId,
  tipo,
  periodo,
  documentos,
}: {
  turmaId?: string
  coachId?: string
  tipo: DocumentoAssinadoTipo
  periodo: string
  documentos: DocumentoAssinadoItem[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [leitura, setLeitura] = useState<AssinaturaPdf[] | null>(null) // assinaturas do PDF escolhido
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function applyFile(file: File | undefined | null) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Apenas arquivos PDF são aceitos.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande (máx 10 MB).')
      return
    }
    setError(null)
    setSelectedFile(file)
    setLeitura(null)
    file.arrayBuffer().then((b) => setLeitura(lerAssinaturasPdf(new Uint8Array(b)))).catch(() => setLeitura([]))
    if (fileInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileInputRef.current.files = dt.files
    }
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    applyFile(e.dataTransfer.files?.[0])
  }

  function resetForm() {
    setOpen(false)
    setError(null)
    setSelectedFile(null)
    setLeitura(null)
    formRef.current?.reset()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    setError(null)
    const meta = { turmaId: turmaId ?? null, coachId: coachId ?? null, tipo, periodo, nomeArquivo: selectedFile.name }
    startTransition(async () => {
      // 1) autorização de envio · 2) envio direto ao Storage · 3) registro e conferência
      const prep = await prepararEnvioDocumento({ ...meta, tamanho: selectedFile.size })
      if (prep.error || !prep.path || !prep.token) { setError(prep.error ?? 'Erro ao preparar o envio.'); return }
      const { error: erroEnvio } = await createClient().storage
        .from('documentos')
        .uploadToSignedUrl(prep.path, prep.token, selectedFile, { contentType: 'application/pdf' })
      if (erroEnvio) { setError('Falha ao enviar o arquivo. Verifique a conexão e tente de novo.'); return }
      const result = await registrarDocumentoAssinado({ ...meta, path: prep.path })
      if (result?.error) { setError(result.error); return }
      resetForm()
    })
  }

  return (
    <div className="print:hidden border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-navy-500">Documentos assinados</h3>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-400 hover:bg-sky-500 px-3 py-2 rounded-lg transition-colors"
        >
          <Upload size={13} /> Enviar documento
        </button>
      </div>

      <ComoAssinarGovBr />

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
                  {doc.assinaturasDigitais && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.assinaturasDigitais.length === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700">
                          <AlertTriangle size={11} /> Sem assinatura digital
                        </span>
                      ) : (
                        doc.assinaturasDigitais.map((a, i) => <SeloAssinatura key={i} a={a} />)
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {doc.assinaturasDigitais && doc.assinaturasDigitais.length > 0 && (
                  <a
                    href={VALIDADOR_ITI}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Validar a assinatura no site oficial do ITI (envie o PDF baixado)"
                    className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-sky-600 px-2 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
                  >
                    <ShieldCheck size={13} /> Validar
                  </a>
                )}
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
                <ConfirmDeleteButton
                  title="Excluir"
                  action={() => deleteDocumentoAssinado(doc.id, doc.storagePath, tipo, turmaId ?? null)}
                />
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
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Arquivo PDF assinado
                </label>
                <label
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
                    isDragging ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-sky-400'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <CheckCircle2 size={20} className="text-emerald-500" />
                      <span className="text-xs text-navy-500 font-medium px-4 text-center break-all">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2"
                      >
                        Trocar arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-gray-300" />
                      <span className="text-xs text-gray-400 text-center px-4">
                        Arraste o PDF aqui ou clique para selecionar (máx 10 MB)
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    name="file"
                    type="file"
                    accept="application/pdf"
                    required
                    className="hidden"
                    onChange={(e) => applyFile(e.target.files?.[0])}
                  />
                </label>
              </div>

              {selectedFile && leitura && (
                leitura.length > 0 ? (
                  <div className="text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2 space-y-1">
                    <p className="font-medium text-green-700">Assinatura digital encontrada:</p>
                    <div className="flex flex-wrap gap-1">{leitura.map((a, i) => <SeloAssinatura key={i} a={a} />)}</div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 mt-px" />
                    <span>
                      Este PDF não tem assinatura digital. Assine no gov.br antes de enviar, ou envie mesmo assim se for
                      um documento assinado à mão e digitalizado.
                    </span>
                  </p>
                )
              )}

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-sky-400 hover:bg-sky-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {pending ? 'Enviando…' : leitura && leitura.length === 0 ? 'Enviar mesmo assim' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
