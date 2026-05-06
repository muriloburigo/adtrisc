'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X } from 'lucide-react'
import { uploadAvatar } from '@/app/actions/upload-avatar'

interface Props {
  folder: 'alunos' | 'coaches'
  currentUrl?: string | null
  name: string
  onUpload: (url: string) => void
}

function compressImage(file: File, maxPx = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > height) {
        if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx }
      } else {
        if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
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

export default function AvatarUpload({ folder, currentUrl, name, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)

    try {
      const compressed = await compressImage(file)
      const localPreview = URL.createObjectURL(compressed)
      setPreview(localPreview)

      const fd = new FormData()
      fd.set('file', compressed, `avatar.jpg`)
      fd.set('folder', folder)

      const result = await uploadAvatar(fd)

      URL.revokeObjectURL(localPreview)

      if (result.error) {
        setPreview(currentUrl ?? null)
        setError(result.error)
      } else if (result.url) {
        setPreview(result.url)
        onUpload(result.url)
      }
    } catch {
      setPreview(currentUrl ?? null)
      setError('Erro ao processar imagem.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    setPreview(null)
    onUpload('')
    setError('')
  }

  const initial = name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-shrink-0">
        {preview ? (
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
            <Image
              src={preview}
              alt={name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-black text-white text-2xl border-2 border-gray-200"
            style={{ background: '#2AABE1' }}
          >
            {initial}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Camera size={13} />
            {preview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {preview && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleRemove}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-50 transition-colors"
            >
              <X size={12} /> Remover
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <p className="text-xs text-gray-400">JPG ou PNG · máx 3 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
