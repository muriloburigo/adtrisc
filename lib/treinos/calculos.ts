// Cálculos do treino portados do Movelly Core:
//  - normalizarPassos / validarSessao  ← TrainingStepNormalizerService
//  - metricasPlanejadas                ← SessionPlannedMetricsService
//  - calcularCarga / somarSessoes      ← TrainingLoadCalculatorService
// Diferença deliberada: as zonas são as da ADTRISC (Z1–Z5, % da velocidade do
// teste, config_avaliacao.zona_limites) e não as 8 zonas do Movelly — assim o
// treino usa as mesmas zonas que os treinadores já imprimem em /avaliacoes.
import { ZONA_LIMITES_PADRAO } from '@/lib/zonas'
import type { Modalidade, Passo, TipoSessao } from './tipos'

// ── Referência do atleta (100% = velocidade do teste) ───────────────────────
/** Velocidade de referência em m/s para a modalidade. */
export type Referencia = { modalidade: Modalidade; velocidade_ms: number; origem: 'limiar' | 'teste' | 'padrao' }

// Sem teste nem limiar: referências medianas da Pré equipe (aprox.).
const REFERENCIA_PADRAO_MS: Record<string, number> = {
  running: 1000 / 270,   // 4:30/km (≈ 1.110 m no Dabonneville)
  cycling: 30 / 3.6,     // 30 km/h
  swimming: 100 / 120,   // 2:00/100 m
}

export function referenciaPadrao(modalidade: Modalidade): Referencia {
  return { modalidade, velocidade_ms: REFERENCIA_PADRAO_MS[modalidade] ?? REFERENCIA_PADRAO_MS.running, origem: 'padrao' }
}

/** Faixa de % da referência de uma zona ADTRISC (Z1 começa em 50%). */
export function faixaZona(zona: number, limites: number[] = ZONA_LIMITES_PADRAO): { min: number; max: number } {
  const i = Math.min(Math.max(Math.round(zona), 1), limites.length) - 1
  return { min: i === 0 ? 50 : limites[i - 1], max: limites[i] }
}

/** Velocidade (m/s) no meio de uma zona. */
export function velocidadeDaZona(ref: Referencia, zona: number, limites?: number[]): number {
  const { min, max } = faixaZona(zona, limites)
  return ref.velocidade_ms * ((min + max) / 2) / 100
}

// ── Normalização (TrainingStepNormalizerService) ────────────────────────────
const vazio = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const num = (v: unknown): number | null => (vazio(v) ? null : Number(v))

export function passoEmBranco(p: Partial<Passo>): boolean {
  return vazio(p.titulo) && vazio(p.duracao_s) && vazio(p.distancia_m) && vazio(p.notas)
}

export function normalizarPassos(passos: Partial<Passo>[]): Passo[] {
  return passos
    .filter((p) => !passoEmBranco(p))
    .map((p, i) => ({
      ordem: i + 1,
      tipo: p.tipo ?? 'work',
      titulo: (p.titulo ?? '').trim(),
      duracao_s: num(p.duracao_s),
      distancia_m: num(p.distancia_m),
      intensidade_tipo: p.intensidade_tipo ?? null,
      alvo_min: num(p.alvo_min),
      alvo_max: num(p.alvo_max),
      alvo_unidade: vazio(p.alvo_unidade) ? null : String(p.alvo_unidade),
      grupo_repeticao: num(p.grupo_repeticao),
      repeticoes: num(p.repeticoes),
      aberto: Boolean(p.aberto),
      notas: vazio(p.notas) ? null : String(p.notas).trim(),
    }))
}

/** Mensagens de erro (vazio = ok). */
export function validarSessao(s: { titulo?: string; data?: string; passos: Passo[] }): string[] {
  const erros: string[] = []
  if (!s.titulo?.trim()) erros.push('Informe o título do treino.')
  if (s.data !== undefined && !s.data) erros.push('Informe a data do treino.')
  s.passos.forEach((p, i) => {
    if (p.tipo === 'note') return
    if (!p.duracao_s && !p.distancia_m && !p.aberto) {
      erros.push(`O bloco ${i + 1} precisa ter duração, distância ou finalização aberta.`)
    }
  })
  return erros
}

// ── Métricas planejadas (SessionPlannedMetricsService) ──────────────────────
export type Metricas = { duracao_s: number | null; distancia_km: number | null; pace_medio_s_km: number | null }

function velocidadeDoPasso(p: Passo, ref: Referencia, padrao: number, limites?: number[]): number {
  if (p.alvo_unidade === 'zone' && p.alvo_min !== null) {
    const max = p.alvo_max ?? p.alvo_min
    return (velocidadeDaZona(ref, p.alvo_min, limites) + velocidadeDaZona(ref, max, limites)) / 2
  }
  if (p.alvo_unidade === 'pace' && p.alvo_min !== null) {
    const pace = (p.alvo_min + (p.alvo_max ?? p.alvo_min)) / 2 // s por km (natação: por 100 m)
    return (ref.modalidade === 'swimming' ? 100 : 1000) / pace
  }
  if (p.alvo_unidade === 'kmh' && p.alvo_min !== null) return ((p.alvo_min + (p.alvo_max ?? p.alvo_min)) / 2) / 3.6
  return velocidadeDaZona(ref, padrao, limites)
}

/**
 * Duração e distância estimadas a partir dos passos e da referência do atleta.
 * Como no Movelly: repetição = passo com repeticoes > 1 seguido de 'recovery'
 * (o descanso de cada rep); usa o maior entre a estimativa e o valor digitado.
 */
export function metricasPlanejadas(
  passos: Passo[],
  ref: Referencia,
  digitado: { duracao_min?: number | null; distancia_km?: number | null } = {},
  limites?: number[],
): Metricas {
  let seg = 0
  let km = 0
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem)
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    if (p.tipo === 'note') continue
    const reps = Math.max(1, p.repeticoes ?? 1)
    const somar = (q: Passo, zonaPadrao: number) => {
      if (q.distancia_m) {
        const d = q.distancia_m / 1000
        seg += (q.distancia_m / velocidadeDoPasso(q, ref, zonaPadrao, limites)) * reps
        km += d * reps
      } else if (q.duracao_s) {
        seg += q.duracao_s * reps
        if (q.tipo !== 'strength' && ref.modalidade !== 'strength') {
          km += (q.duracao_s * velocidadeDoPasso(q, ref, zonaPadrao, limites)) / 1000 * reps
        }
      }
    }
    somar(p, 2)
    const prox = ord[i + 1]
    if (reps > 1 && prox?.tipo === 'recovery') {
      somar(prox, 1)
      i++
    }
  }
  const durS = Math.max(Math.ceil(seg), (digitado.duracao_min ?? 0) * 60)
  const distKm = Math.max(km, Number(digitado.distancia_km ?? 0))
  return {
    duracao_s: durS > 0 ? durS : null,
    distancia_km: distKm > 0 ? Math.round(distKm * 100) / 100 : null,
    pace_medio_s_km: distKm > 0 && durS > 0 ? Math.round(durS / distKm) : null,
  }
}

// ── Carga (TrainingLoadCalculatorService) ───────────────────────────────────
const MULT_TIPO: Record<TipoSessao, number> = {
  recovery: 0.55, technique: 0.7, strength: 0.75, base: 0.85, long: 0.95, brick: 1.05, race_simulation: 1.15, interval: 1.25,
}

export function calcularCarga(s: {
  duracao_min?: number | null
  distancia_km?: number | null
  tipo?: TipoSessao
  intensidade_tipo?: string | null
  intensidade_alvo?: string | null
}): number {
  let dur = Number(s.duracao_min ?? 0)
  const dist = Number(s.distancia_km ?? 0)
  if (dur <= 0 && dist > 0) dur = dist * 6.5
  if (dur <= 0) return 0
  const mt = MULT_TIPO[s.tipo ?? 'base'] ?? 0.85
  let mi = 1
  const alvo = (s.intensidade_alvo ?? '').toLowerCase()
  if (s.intensidade_tipo && s.intensidade_tipo !== 'open') {
    const z = alvo.match(/z\s*([1-7])/)
    const r = alvo.match(/rpe\s*(10|[1-9])/)
    if (z) mi = [0, 0.62, 0.78, 0.92, 1.08, 1.24, 1.38, 1.5][Number(z[1])]
    else if (r) mi = Math.max(0.55, Math.min(1.45, Number(r[1]) / 7))
    else mi = s.intensidade_tipo === 'rpe' ? 1 : s.intensidade_tipo === 'zone' ? 0.95 : 1.05
  }
  return Math.round(dur * mt * mi * 100) / 100
}

export function somarSessoes(sessoes: { duracao_min?: number | null; distancia_km?: number | null; carga?: number | null }[]) {
  return {
    duracao_min: sessoes.reduce((t, s) => t + Number(s.duracao_min ?? 0), 0),
    distancia_km: Math.round(sessoes.reduce((t, s) => t + Number(s.distancia_km ?? 0), 0) * 100) / 100,
    carga: Math.round(sessoes.reduce((t, s) => t + Number(s.carga ?? 0), 0) * 100) / 100,
  }
}

// ── Formatação ──────────────────────────────────────────────────────────────
export function formatarDuracao(seg: number | null | undefined): string {
  if (!seg) return '—'
  const s = Math.round(seg)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

export function formatarPace(segPorUnidade: number | null | undefined, unidade = '/km'): string {
  if (!segPorUnidade) return '—'
  const s = Math.round(segPorUnidade)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}${unidade}`
}

/** Pace ou velocidade a partir de m/s, no formato da modalidade. */
export function formatarVelocidade(v: number, modalidade: Modalidade): string {
  if (modalidade === 'cycling') return `${(v * 3.6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/h`
  if (modalidade === 'swimming') return formatarPace(100 / v, '/100m')
  return formatarPace(1000 / v, '/km')
}
