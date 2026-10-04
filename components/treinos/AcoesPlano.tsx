'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Send } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import { apagarPlano, atualizarPlano, duplicarPlano, publicarPlano } from '@/app/(dashboard)/treinos/planos-actions'
import { somarDias } from '@/lib/treinos/datas'

const input = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-sky-400'
const rotulo = 'block text-xs font-medium text-gray-500 mb-1'

export default function AcoesPlano({ plano, rascunhos, voltar }: {
  plano: { id: string; titulo: string; notas: string | null; prova_alvo_nome: string | null; prova_alvo_data: string | null; inicio: string }
  rascunhos: number
  voltar: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [f, setF] = useState({ titulo: plano.titulo, notas: plano.notas ?? '', prova_alvo_nome: plano.prova_alvo_nome ?? '', prova_alvo_data: plano.prova_alvo_data ?? '' })
  const [novoInicio, setNovoInicio] = useState(somarDias(plano.inicio, 7 * 8))

  const executar = (fn: () => Promise<{ error?: string }>, ok: string, depois?: () => void) => startTransition(async () => {
    const r = await fn()
    setMsg(r.error ? { ok: false, t: r.error } : { ok: true, t: ok })
    if (!r.error) { depois?.(); router.refresh() }
  })

  return (
    <div className="space-y-3">
      {msg && <p className={`text-sm rounded-lg px-3 py-2 ${msg.ok ? 'text-green-700 bg-green-50' : 'text-red-500 bg-red-50'}`}>{msg.t}</p>}
      {rascunhos > 0 && (
        <button disabled={pending} onClick={() => executar(() => publicarPlano(plano.id), 'Plano publicado: os atletas já veem os treinos.')}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2.5 disabled:opacity-50">
          <Send size={14} /> Publicar plano ({rascunhos} rascunho{rascunhos > 1 ? 's' : ''})
        </button>
      )}

      <form className="bg-white rounded-xl border border-gray-200 p-4 space-y-2" onSubmit={(e) => { e.preventDefault(); executar(() => atualizarPlano(plano.id, f), 'Plano salvo.') }}>
        <p className="text-sm font-semibold text-navy-500">Dados do plano</p>
        <div><label className={rotulo}>Nome</label><input className={input} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={rotulo}>Prova alvo</label><input className={input} value={f.prova_alvo_nome} onChange={(e) => setF({ ...f, prova_alvo_nome: e.target.value })} /></div>
          <div><label className={rotulo}>Data</label><input type="date" className={input} value={f.prova_alvo_data} onChange={(e) => setF({ ...f, prova_alvo_data: e.target.value })} /></div>
        </div>
        <div><label className={rotulo}>Observações</label><textarea className={`${input} resize-none`} rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
        <button disabled={pending} className="text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2 disabled:opacity-50">Salvar</button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-sm font-semibold text-navy-500">Duplicar plano</p>
        <p className="text-[11px] text-gray-400">Copia todos os treinos para um novo início, como rascunho.</p>
        <div className="flex gap-2">
          <input type="date" className={input} value={novoInicio} onChange={(e) => setNovoInicio(e.target.value)} />
          <button disabled={pending} onClick={() => startTransition(async () => {
            const r = await duplicarPlano(plano.id, novoInicio)
            if (r.error) { setMsg({ ok: false, t: r.error }); return }
            router.push(`/treinos/planos/${r.id}`)
          })} className="shrink-0 inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-3 py-2 disabled:opacity-50">
            <Copy size={14} /> Duplicar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-red-100 p-4">
        <ConfirmDeleteButton variant="full" label="Apagar plano e todos os treinos dele" confirmLabel="Apagar mesmo? Os treinos somem do calendário." size={14}
          action={async () => { const r = await apagarPlano(plano.id); if (!r.error) router.push(voltar); return r }} />
      </div>
    </div>
  )
}
