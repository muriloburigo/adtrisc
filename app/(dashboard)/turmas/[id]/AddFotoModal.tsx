'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, X, Loader2, Upload } from 'lucide-react'
import { addTurmaFoto } from './galeria/actions'

function compressImage(file: File, maxPx = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (Math.max(width, height) > maxPx) {
        if (width > height) { height = Math.round(height * maxPx / width); width = maxPx }
        else { width = Math.round(width * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compressão falhou'))),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = reject
    img.src = objectUrl
  })
}

export default function AddFotoModal({ turmaId }: { turmaId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null)
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(new Date().toLocaleDateString('en-CA'))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function handleClose() {
    setOpen(false)
    setPreview(null)
    setCompressedBlob(null)
    setTitulo('')
    setData(new Date().toLocaleDateString('en-CA'))
    setError('')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const blob = await compressImage(file)
      setCompressedBlob(blob)
      const url = URL.createObjectURL(blob)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(url)
    } catch {
      setError('Erro ao processar imagem.')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!compressedBlob) { setError('Selecione uma imagem.'); return }
    if (!titulo.trim()) { setError('Informe um título.'); return }

    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.set('file', compressedBlob, 'foto.jpg')
      fd.set('titulo', titulo.trim())
      fd.set('data', data)

      const result = await addTurmaFoto(turmaId, fd)

      if (result?.error) {
        setError(result.error)
      } else {
        handleClose()
        router.push(`/turmas/${turmaId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar foto. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-400 hover:bg-sky-500 px-3 py-2 rounded-lg transition-colors"
      >
        <ImagePlus size={13} /> Adicionar foto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-navy-500 flex items-center gap-2">
                <ImagePlus size={15} className="text-sky-400" /> Adicionar foto
              </h2>
              <button onClick={handleClose} disabled={uploading} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Image picker */}
              <div
                onClick={() => !uploading && inputRef.current?.click()}
                className={`relative w-full aspect-video rounded-xl border-2 border-dashed overflow-hidden cursor-pointer transition-colors ${
                  preview ? 'border-gray-200' : 'border-gray-300 hover:border-sky-400 bg-gray-50'
                }`}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Upload size={24} />
                    <span className="text-xs font-medium">Clique para selecionar</span>
                    <span className="text-xs">JPG ou PNG · máx 15 MB</span>
                  </div>
                )}
                {preview && (
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 hover:opacity-100 text-white text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-lg transition-opacity">
                      Trocar imagem
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Título */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Título</label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Treino de natação — turma A"
                  maxLength={120}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Data</label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

              {/* Footer */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="flex-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !compressedBlob}
                  className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-sky-400 hover:bg-sky-500 disabled:opacity-50 px-4 py-2.5 rounded-xl transition-colors"
                >
                  {uploading ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
