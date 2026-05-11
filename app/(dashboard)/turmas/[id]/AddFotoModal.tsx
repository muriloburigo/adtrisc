'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, X, Upload } from 'lucide-react'
import { addFotoTurma } from './galeria/actions'

export default function AddFotoModal({ turmaId }: { turmaId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setPreview(URL.createObjectURL(f))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('turma_id', turmaId)
    startTransition(async () => {
      await addFotoTurma(fd)
      setOpen(false)
      setPreview(null)
      formRef.current?.reset()
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-sky-400 hover:bg-sky-500 px-3 py-2 rounded-lg transition-colors"
      >
        <Plus size={13} /> Adicionar foto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-navy-500">Adicionar foto</h2>
              <button onClick={() => { setOpen(false); setPreview(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Título
                </label>
                <input
                  name="titulo"
                  required
                  placeholder="Ex: Treino de ciclismo"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Data
                </label>
                <input
                  name="data"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Foto
                </label>
                {preview ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPreview(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-8 cursor-pointer hover:border-sky-400 transition-colors">
                    <Upload size={20} className="text-gray-300" />
                    <span className="text-xs text-gray-400">Clique para selecionar</span>
                    <input name="file" type="file" accept="image/*" required className="hidden" onChange={handleFile} />
                  </label>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setPreview(null) }}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="flex-1 bg-sky-400 hover:bg-sky-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {pending ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
