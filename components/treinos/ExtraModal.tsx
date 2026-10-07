'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Link2, Trash2, X } from 'lucide-react'
import { apagarAtividade, moverAtividade, vincularAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'
import ComparativoTreino, { type ExecucaoView } from './ComparativoTreino'
import { MODALIDADES, type Modalidade } from '@/lib/treinos/tipos'

const ORIGEM = { intervals: 'Intervals.icu', upload: 'Arquivo .fit', manual: 'Lançamento manual' }
const rotulo = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1'
const caixa = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 truncate'

/**
 * Atividade feita sem treino planejado. Mesma moldura do modal do treino
 * (cabeçalho, aba, corpo e rodapé); muda o conteúdo: só o realizado, e à
 * direita vincular a um treino (por similaridade) e mudar de dia.
 */
export default function ExtraModal({ extra, opcoes, onFechar }: {
  extra: ExecucaoView
  opcoes: { id: string; rotulo: string; similaridade?: number | null }[]
  onFechar: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [data, setData] = useState(new Date(extra.executado_em).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }))
  const acao = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    setErro(null)
    const r = await fn()
    if (r.error) { setErro(r.error); return }
    router.refresh(); onFechar()
  })
  const mod = (extra.modalidade ?? 'other') as Modalidade

  const ladoDireito = (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Vincular a um treino</p>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {opcoes.length ? opcoes.map((o) => (
            <div key={o.id} className="flex items-center gap-2 px-3 py-2">
              <p className="flex-1 min-w-0 text-sm text-navy-500 truncate">{o.rotulo}</p>
              {o.similaridade != null && (
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${o.similaridade >= 0.75 ? 'bg-green-50 text-green-700' : o.similaridade >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{Math.round(o.similaridade * 100)}% parecida</span>
              )}
              <button disabled={pending} onClick={() => acao(() => vincularAtividade(extra.id, o.id))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"><Link2 size={12} /> Vincular</button>
            </div>
          )) : <p className="px-3 py-3 text-sm text-gray-400">Nenhum treino publicado sem atividade nos 3 dias em volta.</p>}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">No calendário, também dá para arrastar o card sobre o treino.</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-1">Mudar de dia</p>
        <div className="flex gap-2">
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <button disabled={pending} onClick={() => acao(() => moverAtividade(extra.id, data))}
            className="inline-flex items-center gap-1.5 text-sm border border-gray-200 bg-white rounded-lg px-3 hover:bg-gray-50 disabled:opacity-50"><CalendarClock size={14} /> Mover</button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Para corrigir quando o relógio gravou a data errada.</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/40 sm:p-4" onClick={onFechar}>
      <div className="bg-gray-50 sm:rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-[100svh] sm:h-[88vh]" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho (mesma estrutura do treino planejado) */}
        <div className="bg-white sm:rounded-t-2xl px-5 pt-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400">Atividade sem treino planejado · extra</p>
              <p className="text-lg font-semibold text-navy-500 truncate">{extra.titulo ?? 'Atividade'}</p>
            </div>
            <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pb-3">
            <div><span className={rotulo}>Data</span><p className={caixa}>{new Date(extra.executado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}</p></div>
            <div><span className={rotulo}>Modalidade</span><p className={caixa}>{MODALIDADES[mod] ?? extra.modalidade ?? '—'}</p></div>
            <div><span className={rotulo}>Origem</span><p className={caixa}>{ORIGEM[extra.origem]}</p></div>
            <div><span className={rotulo}>Aparelho</span><p className={caixa}>{extra.dados?.dispositivo ?? '—'}</p></div>
          </div>
          <div className="flex gap-1">
            <span className="px-3 py-2 text-sm font-medium border-b-2 -mb-px border-sky-400 text-navy-500">Realizado</span>
          </div>
        </div>

        {/* Corpo: o mesmo comparativo, só com o realizado */}
        <div className="flex-1 overflow-y-auto p-4">
          <ComparativoTreino sessaoId="" alunoId="" modalidade={mod} planejado={null} execucao={extra} podeEditar={false} mostrarDownload={false} ladoDireito={ladoDireito} />
        </div>

        {erro && <div className="bg-white px-4 pt-3 border-t border-gray-200"><p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p></div>}
        {/* Rodapé */}
        <div className="bg-white sm:rounded-b-2xl border-t border-gray-200 px-4 py-3 flex items-center gap-2">
          {extra.origem !== 'intervals' && (
            <button disabled={pending} onClick={() => acao(() => apagarAtividade(extra.id))} className="inline-flex items-center gap-1 text-sm text-red-500 disabled:opacity-50"><Trash2 size={14} /> Apagar atividade</button>
          )}
          <button onClick={onFechar} className="ml-auto text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2">Fechar</button>
        </div>
      </div>
    </div>
  )
}
