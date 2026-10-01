'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeft, Check, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import { responderTransferencia, cancelarTransferencia } from './transferencias-actions'
import type { TransferenciaPendente } from '@/lib/transferencias'

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

function Linha({ t, papel }: { t: TransferenciaPendente; papel: 'responder' | 'enviada' }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const agir = (fn: () => Promise<{ error?: string }>) => {
    setErro(null)
    startTransition(async () => {
      const r = await fn()
      if (r.error) setErro(r.error)
      router.refresh()
    })
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-navy-500">
            <strong>{t.alunoNome}</strong>
            <span className="text-gray-400"> · {t.origemNome ?? 'sem turma'} → </span>
            <strong>{t.destinoNome}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t.tipo === 'envio' ? 'Enviado' : 'Pedido'} por {t.criadoPorNome ?? '—'} em {data(t.criadoEm)} · expira em {data(t.expiraEm)}
          </p>
          {t.observacao && <p className="text-xs text-gray-600 mt-1 italic">“{t.observacao}”</p>}
        </div>
        {papel === 'responder' && !recusando && (
          <div className="flex gap-2 shrink-0">
            <button
              disabled={pending}
              onClick={() => agir(() => responderTransferencia(t.id, true))}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
            >
              <Check size={13} /> Aceitar
            </button>
            <button
              disabled={pending}
              onClick={() => setRecusando(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-1.5 disabled:opacity-50"
            >
              <X size={13} /> Recusar
            </button>
          </div>
        )}
        {papel === 'enviada' && (
          <button
            disabled={pending}
            onClick={() => agir(() => cancelarTransferencia(t.id))}
            className="text-xs text-gray-400 hover:text-red-500 shrink-0 disabled:opacity-50"
          >
            Cancelar pedido
          </button>
        )}
      </div>
      {recusando && (
        <div className="mt-2 flex gap-2 flex-wrap">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            placeholder="Motivo (opcional)"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            disabled={pending}
            onClick={() => agir(() => responderTransferencia(t.id, false, motivo))}
            className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
          >
            Confirmar recusa
          </button>
          <button onClick={() => setRecusando(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Voltar</button>
        </div>
      )}
      {erro && <p className="text-xs text-red-500 mt-1">{erro}</p>}
    </li>
  )
}

export default function PendenciasTransferencias({
  paraResponder, enviadas,
}: {
  paraResponder: TransferenciaPendente[]
  enviadas: TransferenciaPendente[]
}) {
  if (!paraResponder.length && !enviadas.length) return null
  return (
    <Card className="mb-4 border-sky-200">
      <h2 className="text-sm font-semibold text-navy-500 flex items-center gap-2">
        <ArrowRightLeft size={16} className="text-sky-400" /> Transferências
      </h2>
      {paraResponder.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mt-1">Aguardando você ({paraResponder.length})</p>
          <ul className="divide-y divide-gray-100">{paraResponder.map((t) => <Linha key={t.id} t={t} papel="responder" />)}</ul>
        </>
      )}
      {enviadas.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mt-3">Enviadas por você, aguardando resposta ({enviadas.length})</p>
          <ul className="divide-y divide-gray-100">{enviadas.map((t) => <Linha key={t.id} t={t} papel="enviada" />)}</ul>
        </>
      )}
    </Card>
  )
}
