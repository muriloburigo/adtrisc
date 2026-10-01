'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine } from 'lucide-react'
import Card from '@/components/ui/Card'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { SignaturePad } from '@/components/enrollment/CamposComuns'
import { salvarAssinatura } from '@/app/(dashboard)/conta/assinatura-actions'

/** Assinatura do treinador: ver, desenhar de novo e remover. */
export default function AssinaturaCard({
  perfilId, atual, atualizadaEm, proprio,
}: {
  perfilId: string
  atual: string | null
  atualizadaEm: string | null
  proprio: boolean // true = "Minha assinatura"; false = admin editando um treinador
}) {
  const router = useRouter()
  const [desenhando, setDesenhando] = useState(false)
  const [nova, setNova] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function salvar() {
    if (!nova) return
    setErro(null)
    startTransition(async () => {
      const res = await salvarAssinatura(perfilId, nova)
      if (res?.error) { setErro(res.error); return }
      setDesenhando(false)
      setNova(null)
      router.refresh()
    })
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <PenLine size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">{proprio ? 'Minha assinatura' : 'Assinatura'}</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Entra automaticamente no rodapé do relatório da turma, da exportação de presenças e do diário de aulas
        {proprio ? ' das suas turmas' : ' deste(a) treinador(a)'}. Em cada relatório dá para desmarcar.
      </p>

      {!desenhando && (
        atual ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={atual} alt="Assinatura cadastrada" className="max-h-24 w-auto" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setDesenhando(true)} className="text-sm font-medium text-sky-500 hover:text-sky-600">
                Desenhar de novo
              </button>
              <ConfirmDeleteButton
                variant="full"
                label="Remover assinatura"
                confirmLabel="Remover?"
                action={() => salvarAssinatura(perfilId, null)}
                onSuccess={() => router.refresh()}
              />
              {atualizadaEm && (
                <span className="text-xs text-gray-400 ml-auto">
                  Cadastrada em {new Date(atualizadaEm).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setDesenhando(true)}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 py-6 text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500"
          >
            Nenhuma assinatura cadastrada. Toque para desenhar.
          </button>
        )
      )}

      {desenhando && (
        <div className="space-y-3">
          <SignaturePad onChange={setNova} />
          {erro && <p className="text-sm text-red-500">{erro}</p>}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setDesenhando(false); setNova(null); setErro(null) }} className="text-sm text-gray-400 hover:text-gray-600 px-3">
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!nova || pending}
              className="text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2 disabled:opacity-50"
            >
              {pending ? 'Salvando…' : 'Salvar assinatura'}
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
