'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Trash2, X } from 'lucide-react'
import { apagarAtividade, moverAtividade, vincularAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'
import { GraficoZonas, type ExecucaoView } from './ComparativoTreino'
import { formatarDuracao, formatarVelocidade } from '@/lib/treinos/calculos'
import type { Modalidade } from '@/lib/treinos/tipos'

/** Atividade extra (feita sem treino): vincular a um treino próximo, mover de dia ou apagar. */
export default function ExtraModal({ extra, opcoes, onFechar }: { extra: ExecucaoView; opcoes: { id: string; rotulo: string }[]; onFechar: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [alvo, setAlvo] = useState(opcoes[0]?.id ?? '')
  const [data, setData] = useState(new Date(extra.executado_em).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))
  const acao = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    setErro(null)
    const r = await fn()
    if (r.error) { setErro(r.error); return }
    router.refresh(); onFechar()
  })
  const mod = (extra.modalidade ?? 'running') as Modalidade

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onFechar}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-[11px] text-gray-400">Atividade extra · {extra.origem === 'intervals' ? 'Intervals.icu' : extra.origem === 'upload' ? 'arquivo FIT' : 'manual'}</p>
            <p className="font-semibold text-navy-500">{extra.titulo ?? 'Atividade'}</p>
            <p className="text-xs text-gray-500">
              {new Date(extra.executado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}
              {extra.distancia_m ? ` · ${(Number(extra.distancia_m) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : ''}
              {extra.duracao_s ? ` · ${formatarDuracao(extra.duracao_s)}` : ''}
              {extra.velocidade_media_ms ? ` · ${formatarVelocidade(extra.velocidade_media_ms, mod)}` : ''}
              {extra.fc_media ? ` · FC ${extra.fc_media}` : ''}
            </p>
          </div>
          <button onClick={onFechar} className="text-gray-400"><X size={16} /></button>
        </div>
        {extra.zonas?.fc && <GraficoZonas segundos={extra.zonas.fc} titulo="Tempo por zona de FC" />}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500">Vincular a um treino</p>
          {opcoes.length ? (
            <div className="flex gap-2">
              <select value={alvo} onChange={(e) => setAlvo(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
              </select>
              <button disabled={pending || !alvo} onClick={() => acao(() => vincularAtividade(extra.id, alvo))} className="inline-flex items-center gap-1 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-lg px-3 disabled:opacity-50"><Link2 size={13} /> Vincular</button>
            </div>
          ) : <p className="text-xs text-gray-400">Nenhum treino publicado sem atividade nos 3 dias em volta.</p>}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500">Mover para outro dia</p>
          <div className="flex gap-2">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
            <button disabled={pending} onClick={() => acao(() => moverAtividade(extra.id, data))} className="text-sm border border-gray-200 rounded-lg px-3 hover:bg-gray-50 disabled:opacity-50">Mover</button>
          </div>
        </div>
        {extra.origem !== 'intervals' && (
          <button disabled={pending} onClick={() => acao(() => apagarAtividade(extra.id))} className="inline-flex items-center gap-1 text-sm text-red-500"><Trash2 size={13} /> Apagar atividade</button>
        )}
        {erro && <p className="text-sm text-red-500">{erro}</p>}
      </div>
    </div>
  )
}
