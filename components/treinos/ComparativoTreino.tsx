'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Unlink, Upload, Trash2 } from 'lucide-react'
import { desvincularAtividade, apagarAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'
import { formatarDuracao, formatarVelocidade } from '@/lib/treinos/calculos'
import { CORES_ZONA, type Modalidade } from '@/lib/treinos/tipos'

export type ExecucaoView = {
  id: string; origem: 'intervals' | 'upload' | 'manual'; titulo: string | null; modalidade: string | null; executado_em: string
  duracao_s: number | null; distancia_m: number | null; velocidade_media_ms: number | null; pace_medio_s_km: number | null
  fc_media: number | null; fc_max: number | null; potencia_media_w: number | null; calorias: number | null; tss: number | null
  zonas: { fc?: number[]; pace?: number[]; potencia?: number[] } | null; sessao_id: string | null
}

const ORIGEM = { intervals: 'Intervals.icu', upload: 'arquivo FIT', manual: 'lançamento manual' }

/** Gráfico de tempo por zona (porte do zone-bar-chart do Movelly). */
export function GraficoZonas({ segundos, titulo }: { segundos: number[]; titulo: string }) {
  const total = segundos.reduce((t, s) => t + s, 0)
  if (!total) return null
  const zonas = segundos.slice(0, 7)
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{titulo}</p>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {zonas.map((s, i) => s > 0 && <div key={i} style={{ width: `${(s / total) * 100}%`, background: CORES_ZONA[Math.min(i, 4)] }} title={`Z${i + 1}: ${formatarDuracao(s)}`} />)}
      </div>
      <div className="grid grid-cols-5 gap-1 text-[10px] text-gray-500">
        {zonas.slice(0, 5).map((s, i) => (
          <span key={i} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CORES_ZONA[i] }} />Z{i + 1} {Math.round((s / total) * 100)}%</span>
        ))}
      </div>
    </div>
  )
}

export default function ComparativoTreino({ sessaoId, alunoId, modalidade, planejado, execucao, podeEditar = true, mostrarDownload = true }: {
  sessaoId: string
  alunoId: string
  modalidade: Modalidade
  planejado: { duracao_s: number | null; distancia_km: number | null; velocidade_ms: number | null }
  execucao: ExecucaoView | null
  podeEditar?: boolean
  mostrarDownload?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)

  async function enviarFit(f: File) {
    setErro(null); setEnviando(true)
    const fd = new FormData(); fd.set('arquivo', f); fd.set('aluno', alunoId)
    const r = await fetch(`/api/treinos/${sessaoId}/atividade`, { method: 'POST', body: fd })
    setEnviando(false)
    if (!r.ok) { setErro((await r.json().catch(() => ({}))).error ?? 'Não foi possível enviar.'); return }
    router.refresh()
  }
  const acao = (fn: () => Promise<{ error?: string }>) => startTransition(async () => { const r = await fn(); if (r.error) setErro(r.error); else router.refresh() })

  const ritmo = (v: number | null) => (v ? formatarVelocidade(v, modalidade) : '—')
  const dif = (a: number | null, b: number | null, fmt: (n: number) => string) => {
    if (a == null || b == null || !b) return ''
    const d = a - b
    return `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d))} (${d >= 0 ? '+' : '−'}${Math.round(Math.abs(d / b) * 100)}%)`
  }
  const realKm = execucao?.distancia_m != null ? Number(execucao.distancia_m) / 1000 : null
  const linhas: [string, string, string, string][] = execucao ? [
    ['Duração', formatarDuracao(planejado.duracao_s), formatarDuracao(execucao.duracao_s), dif(execucao.duracao_s, planejado.duracao_s, (n) => formatarDuracao(n))],
    ['Distância', planejado.distancia_km ? `${planejado.distancia_km.toLocaleString('pt-BR')} km` : '—', realKm != null ? `${realKm.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : '—', dif(realKm, planejado.distancia_km, (n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km`)],
    [modalidade === 'cycling' ? 'Velocidade média' : 'Pace médio', ritmo(planejado.velocidade_ms), ritmo(execucao.velocidade_media_ms), ''],
    ['FC média / máx.', '—', execucao.fc_media ? `${execucao.fc_media} / ${execucao.fc_max ?? '—'} bpm` : '—', ''],
    ...(execucao.potencia_media_w ? [['Potência média', '—', `${execucao.potencia_media_w} W`, ''] as [string, string, string, string]] : []),
    ...(execucao.tss ? [['Carga (Intervals)', '—', String(Math.round(execucao.tss)), ''] as [string, string, string, string]] : []),
  ] : []

  return (
    <div className="space-y-3">
      {execucao ? (
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-500 truncate">{execucao.titulo ?? 'Atividade'}</p>
              <p className="text-[11px] text-gray-400">{new Date(execucao.executado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })} · via {ORIGEM[execucao.origem]}</p>
            </div>
            {podeEditar && <button disabled={pending} onClick={() => acao(() => desvincularAtividade(execucao.id))} title="Desvincular (vira atividade extra)" className="text-xs text-gray-500 hover:text-amber-600 inline-flex items-center gap-1"><Unlink size={12} /> desvincular</button>}
            {podeEditar && execucao.origem !== 'intervals' && <button disabled={pending} onClick={() => acao(() => apagarAtividade(execucao.id))} title="Apagar atividade" className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-gray-400 text-left"><th className="font-medium py-1"></th><th className="font-medium">Planejado</th><th className="font-medium">Realizado</th><th className="font-medium">Diferença</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {linhas.map(([k, p, r, d]) => (
                <tr key={k}><td className="py-1.5 text-gray-500 text-xs">{k}</td><td className="text-gray-600">{p}</td><td className="font-medium text-navy-500">{r}</td><td className="text-xs text-gray-500">{d}</td></tr>
              ))}
            </tbody>
          </table>
          {execucao.zonas?.fc && <GraficoZonas segundos={execucao.zonas.fc} titulo="Tempo por zona de FC" />}
          {execucao.zonas?.pace && <GraficoZonas segundos={execucao.zonas.pace} titulo="Tempo por zona de pace" />}
        </div>
      ) : (
        <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-3">
          Nenhuma atividade ligada a este treino ainda. Ela chega sozinha pelo Intervals.icu, ou envie o arquivo .fit do relógio.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!execucao && podeEditar && (
          <>
            <input ref={arquivo} type="file" accept=".fit,application/octet-stream" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) enviarFit(f); e.target.value = '' }} />
            <button type="button" disabled={enviando} onClick={() => arquivo.current?.click()} className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50">
              <Upload size={14} /> {enviando ? 'Enviando…' : 'Enviar atividade (.fit)'}
            </button>
          </>
        )}
        {mostrarDownload && (
          <a href={`/api/treinos/${sessaoId}/fit?aluno=${alunoId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-500"><Download size={14} /> Baixar treino (.fit) para o relógio</a>
        )}
      </div>
      {erro && <p className="text-sm text-red-500">{erro}</p>}
    </div>
  )
}
