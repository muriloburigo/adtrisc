'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, CircleDashed } from 'lucide-react'
import { marcarSituacao } from '@/app/(portal)/portal/actions'

type Situacao = 'planejado' | 'feito' | 'nao_feito' | 'parcial'

export default function MarcarSituacao({ sessaoId, situacao, observacao, futuro }: { sessaoId: string; situacao: Situacao; observacao: string; futuro: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [atual, setAtual] = useState<Situacao>(situacao)
  const [obs, setObs] = useState(observacao)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  function marcar(s: Situacao) {
    setErro(null); setSalvo(false)
    startTransition(async () => {
      const r = await marcarSituacao(sessaoId, s, obs)
      if (r.error) { setErro(r.error); return }
      setAtual(s); setSalvo(true)
      router.refresh()
    })
  }

  const btn = (s: Situacao, rotulo: string, Icone: typeof Check, ativo: string) => (
    <button disabled={pending} onClick={() => marcar(atual === s ? 'planejado' : s)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold border transition-colors disabled:opacity-50 ${atual === s ? ativo : 'bg-white border-gray-200 text-gray-600'}`}>
      <Icone size={16} /> {rotulo}
    </button>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
      <p className="text-sm font-semibold text-navy-500">Como foi?</p>
      {futuro && atual === 'planejado' && <p className="text-xs text-gray-400">Depois do treino, volte aqui para marcar.</p>}
      <div className="flex gap-2">
        {btn('feito', 'Feito', Check, 'bg-green-500 border-green-500 text-white')}
        {btn('parcial', 'Parcial', CircleDashed, 'bg-amber-400 border-amber-400 text-white')}
        {btn('nao_feito', 'Não fiz', X, 'bg-red-500 border-red-500 text-white')}
      </div>
      <textarea value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} rows={2}
        placeholder="Comentário para o treinador (opcional): como se sentiu, dor, cansaço…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-400" />
      {atual !== 'planejado' && obs !== observacao && (
        <button disabled={pending} onClick={() => marcar(atual)} className="text-sm text-sky-600 font-medium">Salvar comentário</button>
      )}
      {erro && <p className="text-sm text-red-500">{erro}</p>}
      {salvo && !erro && <p className="text-xs text-green-600">Salvo. O treinador já vê.</p>}
    </div>
  )
}
