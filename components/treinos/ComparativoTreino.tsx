'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Link2, Sparkles, Trash2, Unlink, Upload, UserCheck } from 'lucide-react'
import { apagarAtividade, desvincularAtividade, vincularAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'
import { faixaZona, formatarDuracao, formatarVelocidade, type Referencia } from '@/lib/treinos/calculos'
import { descreverTreino, textoAlvo } from '@/lib/treinos/descricao'
import { similaridade, type DadosExecucao, type Volta } from '@/lib/intervals/atividade'
import { CORES_ZONA, TIPOS_PASSO, type Modalidade, type Passo } from '@/lib/treinos/tipos'

export type ExecucaoView = {
  id: string; origem: 'intervals' | 'upload' | 'manual'; titulo: string | null; modalidade: string | null; executado_em: string
  duracao_s: number | null; distancia_m: number | null; velocidade_media_ms: number | null; pace_medio_s_km: number | null
  fc_media: number | null; fc_max: number | null; potencia_media_w: number | null; calorias: number | null; tss: number | null
  cadencia_media?: number | null; elevacao_m?: number | null
  zonas: { fc?: number[]; pace?: number[]; potencia?: number[]; gap?: number[] } | null; sessao_id: string | null
  dados?: DadosExecucao | null
}

const ORIGEM = { intervals: 'Intervals.icu', upload: 'arquivo .fit', manual: 'lançamento manual' }
const MODALIDADES_CURTO: Record<string, string> = { running: 'Corrida', cycling: 'Bike', swimming: 'Natação', strength: 'Força', other: 'Outro' }
// "feel" do Intervals: 1 = muito bem … 5 = muito mal
const SENSACAO: Record<number, string> = { 1: 'Muito bem', 2: 'Bem', 3: 'Normal', 4: 'Mal', 5: 'Muito mal' }
const diaLocal = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const km = (m: number | null | undefined) => (m ? `${(Number(m) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : null)
const nf = (n: number, casas = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas })

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
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-500">
        {zonas.map((s, i) => s > 0 && (
          <span key={i} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: CORES_ZONA[Math.min(i, 4)] }} />Z{i + 1} {Math.round((s / total) * 100)}% · {formatarDuracao(s)}</span>
        ))}
      </div>
    </div>
  )
}

/** Linhas só do realizado (atividade extra, resumo). */
export function linhasRealizado(e: ExecucaoView, modalidade: Modalidade): [string, string][] {
  const d = e.dados ?? {}
  const linhas: [string, string | null][] = [
    ['Tempo em movimento', e.duracao_s ? formatarDuracao(e.duracao_s) : null],
    ['Tempo total', d.tempo_total_s && e.duracao_s && d.tempo_total_s - e.duracao_s > 30 ? formatarDuracao(d.tempo_total_s) : null],
    ['Distância', km(e.distancia_m)],
    [modalidade === 'cycling' ? 'Velocidade média' : 'Pace médio', e.velocidade_media_ms ? formatarVelocidade(e.velocidade_media_ms, modalidade) : null],
    [modalidade === 'cycling' ? 'Velocidade máxima' : 'Pace máximo', d.vel_max_ms ? formatarVelocidade(d.vel_max_ms, modalidade) : null],
    ['Pace ajustado (GAP)', modalidade === 'running' && d.gap_ms ? formatarVelocidade(d.gap_ms, modalidade) : null],
    ['FC média / máx.', e.fc_media ? `${e.fc_media} / ${e.fc_max ?? '—'} bpm` : null],
    ['Recuperação da FC', d.fcr ? `${d.fcr} bpm` : null],
    ['Cadência', e.cadencia_media ?? d.cadencia_media ? `${nf(Number(e.cadencia_media ?? d.cadencia_media))} ${modalidade === 'cycling' ? 'rpm' : 'ppm'}` : null],
    ['Potência média / NP / máx.', e.potencia_media_w ? `${e.potencia_media_w} / ${d.potencia_np ?? '—'} / ${d.potencia_max ?? '—'} W` : null],
    ['Elevação + / −', e.elevacao_m ?? d.elev_ganho ? `${nf(Number(e.elevacao_m ?? d.elev_ganho))} m / ${d.elev_perda != null ? nf(d.elev_perda) : '—'} m` : null],
    ['Calorias', e.calorias ? `${nf(e.calorias)} kcal` : null],
    ['Carga (Intervals)', e.tss ? nf(e.tss) : null],
    ['Intensidade', d.intensidade ? `${nf(d.intensidade)}%` : null],
    ['TRIMP', d.trimp ? nf(d.trimp) : null],
    ['Desacoplamento', d.desacoplamento != null ? `${nf(d.desacoplamento, 1)}%` : null],
    ['Fator de eficiência', d.eficiencia ? nf(d.eficiencia, 2) : null],
    ['Esforço percebido', d.rpe ? `${d.rpe}/10` : null],
    ['Sensação', d.sensacao ? SENSACAO[d.sensacao] ?? String(d.sensacao) : null],
    ['Passada média', d.passada_m ? `${nf(d.passada_m, 2)} m` : null],
    ['Piscina / comprimentos', d.piscina_m ? `${nf(d.piscina_m)} m / ${d.comprimentos ?? '—'}` : null],
    ['Peso levantado', d.kg_levantados ? `${nf(d.kg_levantados)} kg` : null],
    ['Temperatura', d.temperatura != null ? `${nf(d.temperatura, 1)} °C` : null],
    ['Aparelho', d.dispositivo ?? null],
  ]
  return linhas.filter((l): l is [string, string] => Boolean(l[1]))
}

// ── Tiro a tiro ─────────────────────────────────────────────────────────────
type Planejado = { rotulo: string; trabalho: boolean; duracao_s: number | null; distancia_m: number | null; faixa: { min: number; max: number } | null; alvo: string }

function faixaDoPasso(p: Passo, ref: Referencia | null, limites?: number[]): { min: number; max: number } | null {
  if (p.alvo_min == null) return null
  const max = p.alvo_max ?? p.alvo_min
  if (p.alvo_unidade === 'zone' && ref) {
    return { min: ref.velocidade_ms * faixaZona(Math.min(p.alvo_min, max), limites).min / 100, max: ref.velocidade_ms * faixaZona(Math.max(p.alvo_min, max), limites).max / 100 }
  }
  if (p.alvo_unidade === 'pace') { const un = ref?.modalidade === 'swimming' ? 100 : 1000; return { min: un / Math.max(p.alvo_min, max), max: un / Math.min(p.alvo_min, max) } }
  if (p.alvo_unidade === 'kmh') return { min: Math.min(p.alvo_min, max) / 3.6, max: Math.max(p.alvo_min, max) / 3.6 }
  return null
}

function expandir(passos: Passo[], modalidade: Modalidade, ref: Referencia | null, limites?: number[]): Planejado[] {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem).filter((p) => p.tipo !== 'note')
  const out: Planejado[] = []
  const um = (p: Passo, rot: string): Planejado => ({
    rotulo: rot, trabalho: p.tipo !== 'recovery' && p.tipo !== 'warmup' && p.tipo !== 'cooldown', duracao_s: p.duracao_s, distancia_m: p.distancia_m,
    faixa: faixaDoPasso(p, ref, limites),
    alvo: textoAlvo({ tipo: p.intensidade_tipo ?? 'open', min: p.alvo_min, max: p.alvo_max, unidade: p.alvo_unidade }, modalidade, { referencia: ref, limites }).texto,
  })
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    const n = p.repeticoes ?? 1
    if (n > 1) {
      const desc = ord[i + 1]?.tipo === 'recovery' ? ord[++i] : null
      for (let k = 1; k <= n; k++) {
        out.push(um(p, `${p.titulo || TIPOS_PASSO[p.tipo]} ${k}/${n}`))
        if (desc && k < n) out.push(um(desc, desc.titulo || 'Descanso'))
      }
    } else out.push(um(p, p.titulo || TIPOS_PASSO[p.tipo]))
  }
  return out
}

function TiroATiro({ passos, voltas, modalidade, referencia, limites }: { passos: Passo[]; voltas: Volta[]; modalidade: Modalidade; referencia: Referencia | null; limites?: number[] }) {
  const plan = expandir(passos, modalidade, referencia, limites).filter((p) => p.trabalho)
  const temTipo = voltas.some((v) => v.tipo)
  const exec = temTipo ? voltas.filter((v) => v.tipo === 'WORK') : voltas
  if (!exec.length || !plan.length) return null
  const linhas = Math.max(plan.length, exec.length)
  const dur = (s: number | null | undefined) => (s ? formatarDuracao(s) : '')
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tiro a tiro {temTipo ? '(blocos de esforço)' : '(voltas)'}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-[10px] text-gray-400 text-left"><th className="font-medium py-1 pr-2">#</th><th className="font-medium pr-2">Planejado</th><th className="font-medium pr-2">Realizado</th><th className="font-medium">No alvo?</th></tr></thead>
          <tbody className="divide-y divide-gray-50">
            {Array.from({ length: Math.min(linhas, 40) }, (_, i) => {
              const p = plan[i], v = exec[i]
              let status: { t: string; c: string } | null = null
              if (p?.faixa && v?.vel_ms) {
                const tol = 0.02
                status = v.vel_ms > p.faixa.max * (1 + tol) ? { t: 'acima (rápido)', c: 'text-amber-700 bg-amber-50' }
                  : v.vel_ms < p.faixa.min * (1 - tol) ? { t: 'abaixo (lento)', c: 'text-sky-700 bg-sky-50' } : { t: 'dentro', c: 'text-green-700 bg-green-50' }
              }
              return (
                <tr key={i}>
                  <td className="py-1.5 pr-2 text-gray-400">{i + 1}</td>
                  <td className="pr-2 text-gray-600">{p ? <>{p.distancia_m ? `${nf(p.distancia_m)} m` : dur(p.duracao_s)}{p.alvo && <span className="text-gray-400"> · {p.alvo}</span>}</> : <span className="text-gray-300">—</span>}</td>
                  <td className="pr-2 font-medium text-navy-500">{v ? <>{v.distancia_m ? `${nf(v.distancia_m)} m` : ''}{v.duracao_s ? ` · ${dur(v.duracao_s)}` : ''}{v.vel_ms ? ` · ${formatarVelocidade(v.vel_ms, modalidade)}` : ''}{v.fc_media ? <span className="text-gray-400 font-normal"> · FC {v.fc_media}</span> : null}</> : <span className="text-gray-300">não feito</span>}</td>
                  <td>{status ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${status.c}`}>{status.t}</span> : <span className="text-gray-300">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Componente ──────────────────────────────────────────────────────────────
export type PlanejadoView = {
  data: string
  duracao_s: number | null
  distancia_km: number | null
  velocidade_ms: number | null
  carga?: number | null
  alvo?: string | null
  passos?: Passo[]
}

/** Faixa com a estrutura do treino (como no TrainingPeaks): largura = tempo, altura = intensidade. */
export function GraficoEstrutura({ passos, referencia, limites }: { passos: Passo[]; modalidade?: Modalidade; referencia: Referencia | null; limites?: number[] }) {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem).filter((p) => p.tipo !== 'note')
  const seq: Passo[] = []
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i], n = p.repeticoes ?? 1
    if (n > 1) {
      const d = ord[i + 1]?.tipo === 'recovery' ? ord[++i] : null
      for (let k = 0; k < n; k++) { seq.push(p); if (d && k < n - 1) seq.push(d) }
    } else seq.push(p)
  }
  const blocos = seq.map((p) => {
    const f = faixaDoPasso(p, referencia, limites)
    const vel = f ? (f.min + f.max) / 2 : (referencia?.velocidade_ms ?? 3) * 0.75
    const dur = p.duracao_s ?? (p.distancia_m ? p.distancia_m / vel : 60)
    let nivel = 1
    if (p.alvo_unidade === 'zone' && p.alvo_min != null) nivel = p.alvo_max ?? p.alvo_min
    else if (p.alvo_unidade === 'rpe' && p.alvo_min != null) nivel = p.alvo_min
    else if (f && referencia) { const pct = (vel / referencia.velocidade_ms) * 100; nivel = 1 + (limites ?? [65, 75, 85, 95, 120]).filter((l) => pct > l).length }
    return { dur, nivel: Math.min(5, Math.max(1, Math.round(nivel))), titulo: p.titulo || TIPOS_PASSO[p.tipo] }
  })
  const total = blocos.reduce((t, b) => t + b.dur, 0)
  if (!total) return null
  return (
    <div className="flex items-end h-16 gap-px bg-white rounded-lg border border-gray-200 px-2 pt-2" title="Estrutura do treino">
      {blocos.map((b, i) => (
        <div key={i} title={`${b.titulo} · Z${b.nivel} · ${formatarDuracao(b.dur)}`}
          style={{ width: `${(b.dur / total) * 100}%`, height: `${18 + b.nivel * 16}%`, background: CORES_ZONA[b.nivel - 1] }} className="rounded-t-sm min-w-[2px]" />
      ))}
    </div>
  )
}

export default function ComparativoTreino({ sessaoId, alunoId, modalidade, planejado, execucao, candidatas = [], referencia = null, limites, podeEditar = true, mostrarDownload = true, titulo, notas, comentario }: {
  sessaoId: string
  alunoId: string
  modalidade: Modalidade
  planejado: PlanejadoView
  execucao: ExecucaoView | null
  candidatas?: ExecucaoView[]          // atividades sem treino perto da data (para vincular)
  referencia?: Referencia | null
  limites?: number[]
  podeEditar?: boolean
  mostrarDownload?: boolean
  titulo?: string
  notas?: string | null                // observações do treinador
  comentario?: string | null           // comentário pós-atividade do atleta
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
  const acao = (fn: () => Promise<{ error?: string }>) => startTransition(async () => { setErro(null); const r = await fn(); if (r.error) setErro(r.error); else router.refresh() })

  const e = execucao
  const d = e?.dados ?? {}
  const unidadeRitmo = modalidade === 'cycling' ? 'km/h' : modalidade === 'swimming' ? 'min/100m' : 'min/km'
  const ritmo = (v: number | null | undefined) => (v ? formatarVelocidade(v, modalidade).replace(/\/km|\/100m| km\/h/, '') : null)
  const realKm = e?.distancia_m != null ? Number(e.distancia_m) / 1000 : null
  const dif = (real: number | null | undefined, plan: number | null | undefined) => (real != null && plan ? `${real - plan >= 0 ? '+' : '−'}${Math.round(Math.abs((real - plan) / plan) * 100)}%` : null)

  // Planejado | Realizado | unidade (como no TrainingPeaks)
  const tabela: { k: string; p: string | null; r: string | null; u: string; dif?: string | null }[] = [
    { k: 'Duração', p: planejado.duracao_s ? formatarDuracao(planejado.duracao_s) : null, r: e?.duracao_s ? formatarDuracao(e.duracao_s) : null, u: 'h:m:s', dif: dif(e?.duracao_s, planejado.duracao_s) },
    { k: 'Distância', p: planejado.distancia_km ? nf(planejado.distancia_km, 2) : null, r: realKm != null ? nf(realKm, 2) : null, u: 'km', dif: dif(realKm, planejado.distancia_km) },
    { k: modalidade === 'cycling' ? 'Velocidade média' : 'Pace médio', p: ritmo(planejado.velocidade_ms), r: ritmo(e?.velocidade_media_ms), u: unidadeRitmo },
    { k: 'Calorias', p: null, r: e?.calorias ? nf(e.calorias) : null, u: 'kcal' },
    { k: 'Elevação (subida)', p: null, r: e?.elevacao_m ?? d.elev_ganho ? nf(Number(e?.elevacao_m ?? d.elev_ganho)) : null, u: 'm' },
    { k: 'Carga', p: planejado.carga != null ? nf(planejado.carga) : null, r: e?.tss ? nf(e.tss) : null, u: e?.tss ? 'carga / Intervals' : 'carga' },
    { k: 'Intensidade', p: null, r: d.intensidade ? nf(d.intensidade) : null, u: '%' },
    { k: 'Elevação (descida)', p: null, r: d.elev_perda != null ? nf(d.elev_perda) : null, u: 'm' },
    { k: 'TRIMP', p: null, r: d.trimp ? nf(d.trimp) : null, u: '' },
  ]
  const minMedMax: { k: string; min: string | null; med: string | null; max: string | null; u: string }[] = [
    { k: modalidade === 'cycling' ? 'Velocidade' : 'Pace', min: null, med: ritmo(e?.velocidade_media_ms), max: ritmo(d.vel_max_ms), u: unidadeRitmo },
    { k: 'Frequência cardíaca', min: null, med: e?.fc_media ? String(e.fc_media) : null, max: e?.fc_max ? String(e.fc_max) : null, u: 'bpm' },
    { k: 'Potência', min: null, med: e?.potencia_media_w ? `${e.potencia_media_w}${d.potencia_np ? ` (NP ${d.potencia_np})` : ''}` : null, max: d.potencia_max ? String(d.potencia_max) : null, u: 'W' },
    { k: 'Cadência', min: null, med: e?.cadencia_media ?? d.cadencia_media ? nf(Number(e?.cadencia_media ?? d.cadencia_media)) : null, max: null, u: modalidade === 'cycling' ? 'rpm' : 'ppm' },
  ]
  const mostrados = new Set(['Tempo em movimento', 'Distância', 'Pace médio', 'Velocidade média', 'Pace máximo', 'Velocidade máxima', 'FC média / máx.', 'Cadência', 'Potência média / NP / máx.', 'Elevação + / −', 'Calorias', 'Carga (Intervals)', 'Intensidade', 'TRIMP', 'Esforço percebido', 'Sensação'])
  const maisDados = e ? linhasRealizado(e, modalidade).filter(([k]) => !mostrados.has(k)) : []
  const descricao = planejado.passos?.length ? descreverTreino(planejado.passos, modalidade, { referencia, limites }) : []

  const vinculo = d.vinculo
  const seloVinculo = !e ? null : !vinculo ? { t: 'Vinculado', i: Link2, c: 'bg-gray-100 text-gray-600' }
    : vinculo.modo === 'manual' ? { t: 'Vinculado manualmente', i: UserCheck, c: 'bg-sky-50 text-sky-700' }
      : vinculo.criterio === 'intervals' ? { t: 'Vinculado automaticamente (pareado pelo Intervals)', i: Sparkles, c: 'bg-green-50 text-green-700' }
        : { t: `Vinculado automaticamente · ${Math.round((vinculo.similaridade ?? 0) * 100)}% parecido`, i: Sparkles, c: 'bg-green-50 text-green-700' }

  // Sugestões para vincular: mesma modalidade, até 3 dias, da mais parecida para a menos.
  const sugestoes = e ? [] : candidatas
    .map((c) => ({ c, s: similaridade(
      { modalidade, data: planejado.data, duracao_s: planejado.duracao_s, distancia_m: planejado.distancia_km ? planejado.distancia_km * 1000 : null },
      { modalidade: c.modalidade ?? '', data: diaLocal(c.executado_em), duracao_s: c.duracao_s, distancia_m: c.distancia_m ? Number(c.distancia_m) : null },
    ) }))
    .filter((x): x is { c: ExecucaoView; s: number } => x.s !== null)
    .sort((a, b) => b.s - a.s)

  const celula = 'rounded-md border px-2 py-1 text-center text-sm tabular-nums'
  const grande = (v: string | null, u: string) => v && <span className="whitespace-nowrap"><span className="text-2xl font-bold text-navy-500 tabular-nums">{v}</span>{u && <span className="text-sm font-semibold text-navy-500 ml-1">{u}</span>}</span>

  return (
    <div className="space-y-3">
      {/* Cabeçalho: título + números grandes (realizado se houver, senão planejado) */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-navy-500 truncate">{titulo ?? e?.titulo ?? 'Treino'}</p>
            <p className="text-[11px] text-gray-400">{MODALIDADES_CURTO[modalidade] ?? modalidade}{e ? ` · ${e.titulo ?? 'atividade'} · ${new Date(e.executado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })} · via ${ORIGEM[e.origem]}${d.dispositivo ? ` (${d.dispositivo})` : ''}` : ' · ainda sem atividade'}</p>
          </div>
          {mostrarDownload && <a href={`/api/treinos/${sessaoId}/fit?aluno=${alunoId}`} title="Baixar o treino (.fit) para o relógio" className="p-1.5 rounded-lg text-gray-400 hover:text-navy-500 hover:bg-gray-50"><Download size={16} /></a>}
        </div>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-1 mt-2">
          {grande(e?.duracao_s ? formatarDuracao(e.duracao_s) : planejado.duracao_s ? formatarDuracao(planejado.duracao_s) : null, '')}
          {grande(realKm != null ? nf(realKm, 1) : planejado.distancia_km ? nf(planejado.distancia_km, 1) : null, 'km')}
          {grande(e?.tss ? nf(e.tss) : planejado.carga != null ? nf(planejado.carga) : null, 'carga')}
          {!e && <span className="text-[11px] text-gray-400 pb-1">planejado</span>}
        </div>
        {(seloVinculo || d.cumprimento != null || d.prova) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {seloVinculo && <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded px-1.5 py-0.5 ${seloVinculo.c}`}><seloVinculo.i size={10} /> {seloVinculo.t}</span>}
            {d.cumprimento != null && <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-indigo-50 text-indigo-700" title="Calculado pelo Intervals comparando com o treino enviado">Cumprimento {nf(d.cumprimento)}%</span>}
            {d.prova && <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-red-50 text-red-600">prova</span>}
            {e && podeEditar && <button disabled={pending} onClick={() => acao(() => desvincularAtividade(e.id))} title="Desvincular: vira atividade extra e não é vinculada de novo sozinha" className="ml-auto text-xs text-gray-500 hover:text-amber-600 inline-flex items-center gap-1"><Unlink size={12} /> desvincular</button>}
            {e && podeEditar && e.origem !== 'intervals' && <button disabled={pending} onClick={() => acao(() => apagarAtividade(e.id))} title="Apagar atividade" className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>}
          </div>
        )}
      </div>

      {/* Estrutura do treino */}
      {planejado.passos?.length ? <GraficoEstrutura passos={planejado.passos} modalidade={modalidade} referencia={referencia} limites={limites} /> : null}

      {/* Planejado × Realizado (esq.) · Descrição e comentários (dir.) */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-gray-500"><th></th><th className="font-semibold pb-1">Planejado</th><th className="font-semibold pb-1">Realizado</th><th></th></tr></thead>
            <tbody>
              {tabela.map((l) => (
                <tr key={l.k}>
                  <td className="text-right pr-2 py-0.5 text-xs text-gray-600 whitespace-nowrap">{l.k}</td>
                  <td className="px-0.5 py-0.5 w-[28%]"><div className={`${celula} ${l.p ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>{l.p ?? '—'}</div></td>
                  <td className="px-0.5 py-0.5 w-[28%]"><div className={`${celula} ${l.r ? 'bg-sky-50 border-sky-100 font-semibold text-navy-500' : 'bg-gray-50 border-gray-100 text-gray-300'}`} title={l.dif ? `${l.dif} em relação ao planejado` : undefined}>{l.r ?? '—'}{l.dif && <span className="block text-[9px] font-normal text-gray-400 leading-none">{l.dif}</span>}</div></td>
                  <td className="pl-1.5 text-[11px] text-gray-400 whitespace-nowrap">{l.u}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-gray-500"><th></th><th className="font-semibold pb-1">Mín</th><th className="font-semibold pb-1">Méd</th><th className="font-semibold pb-1">Máx</th><th></th></tr></thead>
            <tbody>
              {minMedMax.map((l) => (
                <tr key={l.k}>
                  <td className="text-right pr-2 py-0.5 text-xs text-gray-600 whitespace-nowrap">{l.k}</td>
                  {[l.min, l.med, l.max].map((v, i) => (
                    <td key={i} className="px-0.5 py-0.5 w-[19%]"><div className={`${celula} ${v ? 'bg-sky-50 border-sky-100 font-semibold text-navy-500' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>{v ?? '—'}</div></td>
                  ))}
                  <td className="pl-1.5 text-[11px] text-gray-400 whitespace-nowrap">{l.u}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {maisDados.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {maisDados.map(([k, v]) => <div key={k} className="flex justify-between gap-2 border-b border-gray-100 py-0.5"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-navy-500 text-right">{v}</dd></div>)}
            </dl>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Descrição do treino</p>
            <div className="bg-white rounded-lg border border-gray-200 p-3 text-sm space-y-2">
              {descricao.length ? descricao.map((l, i) => (
                <div key={i}>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase">{l.rotulo}</p>
                  <p className="text-gray-700">{l.principal}{l.alvo && <span className="text-gray-500"> · {l.alvo}</span>}</p>
                  {l.notas && <p className="text-xs text-gray-400">{l.notas}</p>}
                </div>
              )) : <p className="text-gray-400">Sem blocos.</p>}
            </div>
          </div>
          {notas && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Observações do treinador</p>
              <p className="bg-amber-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{notas}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Comentário pós-atividade</p>
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-sm">
              {comentario ? <p className="text-gray-700 whitespace-pre-line">“{comentario}”</p> : <p className="text-gray-400">O atleta ainda não comentou.</p>}
              {(d.rpe || d.sensacao) && <p className="text-xs text-gray-500 mt-1">{d.rpe ? `Esforço percebido ${d.rpe}/10` : ''}{d.rpe && d.sensacao ? ' · ' : ''}{d.sensacao ? `Sensação: ${SENSACAO[d.sensacao] ?? d.sensacao}` : ''}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Sem atividade: vincular / enviar */}
      {!e && (
        <div className="space-y-2">
          {podeEditar && sugestoes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <p className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Atividades sem treino, parecidas com este (ou arraste no calendário)</p>
              {sugestoes.map(({ c, s }) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-navy-500 truncate">{c.titulo ?? 'Atividade'}</p>
                    <p className="text-[11px] text-gray-400">{new Date(c.executado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}{km(c.distancia_m) ? ` · ${km(c.distancia_m)}` : ''}{c.duracao_s ? ` · ${formatarDuracao(c.duracao_s)}` : ''}</p>
                  </div>
                  <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${s >= 0.75 ? 'bg-green-50 text-green-700' : s >= 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{Math.round(s * 100)}% parecida</span>
                  <button disabled={pending} onClick={() => acao(() => vincularAtividade(c.id, sessaoId))} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50"><Link2 size={12} /> Vincular</button>
                </div>
              ))}
            </div>
          )}
          {podeEditar && (
            <>
              <input ref={arquivo} type="file" accept=".fit,application/octet-stream" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) enviarFit(f); ev.target.value = '' }} />
              <button type="button" disabled={enviando} onClick={() => arquivo.current?.click()} className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50">
                <Upload size={14} /> {enviando ? 'Enviando…' : 'Enviar atividade (.fit)'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Detalhes do realizado */}
      {e && (
        <div className="space-y-3">
          {d.voltas?.length && planejado.passos?.length ? <TiroATiro passos={planejado.passos} voltas={d.voltas} modalidade={modalidade} referencia={referencia} limites={limites} /> : null}
          {d.resumo_intervalos?.length ? <div className="flex flex-wrap gap-1">{d.resumo_intervalos.map((r) => <span key={r} className="text-[10px] bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-gray-600">{r}</span>)}</div> : null}
          {e.zonas?.fc && <GraficoZonas segundos={e.zonas.fc} titulo="Tempo por zona de FC" />}
          {e.zonas?.pace && <GraficoZonas segundos={e.zonas.pace} titulo="Tempo por zona de pace" />}
          {e.zonas?.potencia && <GraficoZonas segundos={e.zonas.potencia} titulo="Tempo por zona de potência" />}
        </div>
      )}
      {erro && <p className="text-sm text-red-500">{erro}</p>}
    </div>
  )
}
