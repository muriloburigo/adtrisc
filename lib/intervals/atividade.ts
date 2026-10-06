// Atividade do Intervals.icu → execução da ADTRISC (porte de IntervalsActivityMapper,
// ampliado com os campos da API oficial — intervals.icu/api/v1/docs) e casamento
// com o treino planejado (porte de ProcessIntervalsActivityAction, com similaridade).
import type { Modalidade } from '@/lib/treinos/tipos'

/** Uma volta/tiro executado (Interval da API do Intervals, ou volta de um .fit). */
export type Volta = {
  tipo: 'WORK' | 'RECOVERY' | null
  rotulo: string | null
  duracao_s: number | null
  distancia_m: number | null
  vel_ms: number | null
  fc_media: number | null
  fc_max: number | null
  potencia: number | null
  cadencia: number | null
  zona: number | null
}

/**
 * Detalhes do realizado guardados em treino_execucoes.dados (jsonb). Tudo
 * opcional: cada origem (Intervals, .fit) traz o que tiver.
 */
export type DadosExecucao = {
  tipo?: string; subtipo?: string | null; dispositivo?: string | null; fonte?: string | null; prova?: boolean
  tempo_total_s?: number | null; vel_max_ms?: number | null; gap_ms?: number | null
  cadencia_media?: number | null; elev_ganho?: number | null; elev_perda?: number | null; temperatura?: number | null
  potencia_np?: number | null; potencia_max?: number | null; intensidade?: number | null; variabilidade?: number | null
  eficiencia?: number | null; desacoplamento?: number | null; trimp?: number | null
  carga_fc?: number | null; carga_pace?: number | null; carga_potencia?: number | null
  rpe?: number | null; sensacao?: number | null; cumprimento?: number | null; fcr?: number | null
  aquecimento_s?: number | null; volta_calma_s?: number | null; passada_m?: number | null
  piscina_m?: number | null; comprimentos?: number | null; kg_levantados?: number | null
  resumo_intervalos?: string[] | null
  evento_pareado?: string | null    // paired_event_id: o Intervals já ligou a atividade a um treino planejado
  analisado?: string | null         // quando o Intervals analisou (re-sincroniza as voltas se mudar)
  voltas?: Volta[] | null
  vinculo?: { modo: 'auto' | 'manual' | 'desvinculado'; criterio?: 'intervals' | 'similaridade'; similaridade?: number; em?: string }
}

export type AtividadeMapeada = {
  id: string
  titulo: string | null
  tipo: string
  modalidade: Modalidade
  data: string                 // dia local da atividade
  executado_em: string         // 'YYYY-MM-DDTHH:MM:SS' local
  duracao_s: number | null     // tempo em movimento
  distancia_m: number | null
  velocidade_media_ms: number | null
  pace_medio_s_km: number | null
  fc_media: number | null
  fc_max: number | null
  calorias: number | null
  potencia_media_w: number | null
  cadencia_media: number | null
  elevacao_m: number | null
  tss: number | null
  zonas: { fc?: number[]; pace?: number[]; potencia?: number[]; gap?: number[] } | null
  dados: DadosExecucao
}

export function modalidadeDoTipo(tipo: string): Modalidade {
  const t = tipo.toLowerCase()
  if (['run', 'virtualrun', 'trailrun'].includes(t)) return 'running'
  if (['ride', 'virtualride', 'mountainbikeride', 'gravelride', 'ebikeride'].includes(t)) return 'cycling'
  if (['swim', 'openwaterswim'].includes(t)) return 'swimming'
  if (['weighttraining', 'workout', 'crossfit'].includes(t)) return 'strength'
  return 'other'
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const int = (v: unknown) => { const n = num(v); return n === null ? null : Math.round(n) }
const arred = (v: unknown, casas = 2) => { const n = num(v); return n === null ? null : Math.round(n * 10 ** casas) / 10 ** casas }
const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
// icu_zone_times (potência) vem como [{id:'Z1', secs}] e as outras como [secs]
function zonasArr(v: unknown): number[] | undefined {
  if (!Array.isArray(v) || !v.length) return undefined
  const out = v.map((x) => (typeof x === 'number' ? x : typeof x === 'object' && x && typeof (x as { secs?: unknown }).secs === 'number' ? (x as { secs: number }).secs : NaN))
  return out.every((x) => Number.isFinite(x)) && out.some((x) => x > 0) ? out : undefined
}

/** Intervals (icu_intervals) → voltas. Só guarda o que interessa ao comparativo. */
export function mapearVoltas(lista: unknown): Volta[] | null {
  if (!Array.isArray(lista) || !lista.length) return null
  return lista.slice(0, 80).map((i: Record<string, unknown>) => ({
    tipo: i.type === 'WORK' || i.type === 'RECOVERY' ? i.type : null,
    rotulo: texto(i.label),
    duracao_s: int(i.moving_time) ?? int(i.elapsed_time),
    distancia_m: arred(i.distance, 1),
    vel_ms: arred(i.average_speed, 3),
    fc_media: int(i.average_heartrate), fc_max: int(i.max_heartrate),
    potencia: int(i.average_watts), cadencia: int(i.average_cadence), zona: int(i.zone),
  }))
}

/** null = atividade sem data/ID ou anterior ao corte. */
export function mapearAtividade(raw: Record<string, unknown>, corte?: string): AtividadeMapeada | null {
  const inicio = String(raw.start_date_local ?? '').slice(0, 19)
  const id = raw.id == null ? '' : String(raw.id)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(inicio) || !id) return null
  if (corte && inicio.slice(0, 10) < corte) return null
  const v = num(raw.average_speed)
  const gap = num(raw.gap)
  const hrr = raw.icu_hrr && typeof raw.icu_hrr === 'object' ? num((raw.icu_hrr as { hrr?: unknown }).hrr) : null
  const zonas = { fc: zonasArr(raw.icu_hr_zone_times), pace: zonasArr(raw.pace_zone_times), potencia: zonasArr(raw.icu_zone_times), gap: zonasArr(raw.gap_zone_times) }
  const resumo = Array.isArray(raw.interval_summary) ? raw.interval_summary.filter((x): x is string => typeof x === 'string').slice(0, 20) : null
  return {
    id, titulo: texto(raw.name), tipo: String(raw.type ?? ''), modalidade: modalidadeDoTipo(String(raw.type ?? '')),
    data: inicio.slice(0, 10), executado_em: inicio,
    duracao_s: int(raw.moving_time) ?? int(raw.elapsed_time), distancia_m: num(raw.distance) ?? num(raw.icu_distance),
    velocidade_media_ms: v && v > 0 ? v : null, pace_medio_s_km: v && v > 0 ? Math.round(1000 / v) : null,
    fc_media: int(raw.average_heartrate), fc_max: int(raw.max_heartrate), calorias: int(raw.calories),
    potencia_media_w: int(raw.icu_average_watts), cadencia_media: int(raw.average_cadence), elevacao_m: int(raw.total_elevation_gain),
    tss: num(raw.icu_training_load),
    zonas: zonas.fc || zonas.pace || zonas.potencia || zonas.gap ? zonas : null,
    dados: {
      tipo: String(raw.type ?? ''), subtipo: texto(raw.sub_type), dispositivo: texto(raw.device_name), fonte: texto(raw.source), prova: raw.race === true,
      tempo_total_s: int(raw.elapsed_time), vel_max_ms: arred(raw.max_speed, 3), gap_ms: gap && gap > 0.3 && gap < 20 ? arred(gap, 3) : null,
      cadencia_media: arred(raw.average_cadence, 1), elev_ganho: int(raw.total_elevation_gain), elev_perda: int(raw.total_elevation_loss),
      temperatura: arred(raw.average_temp, 1),
      potencia_np: int(raw.icu_weighted_avg_watts), potencia_max: int(raw.p_max), intensidade: arred(raw.icu_intensity, 1),
      variabilidade: arred(raw.icu_variability_index, 2), eficiencia: arred(raw.icu_efficiency_factor, 2), desacoplamento: arred(raw.decoupling, 1),
      trimp: arred(raw.trimp, 0), carga_fc: int(raw.hr_load), carga_pace: int(raw.pace_load), carga_potencia: int(raw.power_load),
      rpe: int(raw.icu_rpe), sensacao: int(raw.feel), cumprimento: arred(raw.compliance, 0), fcr: hrr,
      aquecimento_s: int(raw.icu_warmup_time), volta_calma_s: int(raw.icu_cooldown_time), passada_m: arred(raw.average_stride, 2),
      piscina_m: arred(raw.pool_length, 1), comprimentos: int(raw.lengths), kg_levantados: arred(raw.kg_lifted, 0),
      resumo_intervalos: resumo?.length ? resumo : null,
      evento_pareado: raw.paired_event_id == null ? null : String(raw.paired_event_id),
      analisado: texto(raw.analyzed),
    },
  }
}

// ── Similaridade e casamento ───────────────────────────────────────────────
const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000)
const parecido = (a: number | null | undefined, b: number | null | undefined) =>
  a && b && a > 0 && b > 0 ? Math.max(0, 1 - Math.abs(a - b) / Math.max(a, b)) : null

export type ParaComparar = { modalidade: Modalidade | string; data: string; duracao_s: number | null; distancia_m: number | null }

/**
 * Quão parecida uma atividade é de um treino planejado (0 a 1), ou null se não
 * dá para casar (modalidade diferente ou mais de 3 dias de distância).
 * Peso: dia (mesmo dia vale mais) + distância e duração parecidas.
 */
export function similaridade(plano: ParaComparar, at: ParaComparar): number | null {
  if (plano.modalidade !== at.modalidade) return null
  const dias = Math.abs(diasEntre(plano.data, at.data))
  if (dias > 3) return null
  const partes = [parecido(plano.distancia_m, at.distancia_m), parecido(plano.duracao_s, at.duracao_s)].filter((x): x is number => x !== null)
  const forma = partes.length ? partes.reduce((t, x) => t + x, 0) / partes.length : 0.5
  const dia = dias === 0 ? 1 : dias === 1 ? 0.6 : 0.3
  return Math.round((0.45 * dia + 0.55 * forma) * 100) / 100
}

export type Candidata = { id: string; modalidade: Modalidade; data: string; duracao_min: number | null; distancia_km: number | null; evento?: string | null }

/**
 * Treino que a atividade cumpre. 1º: o que o próprio Intervals pareou
 * (paired_event_id = evento que enviamos). 2º: o mais parecido da mesma
 * modalidade — no mesmo dia sempre casa; no dia vizinho só se a distância/
 * duração forem bem parecidas. Sem candidato → atividade extra.
 */
export function escolherTreino(candidatas: Candidata[], a: Pick<AtividadeMapeada, 'modalidade' | 'distancia_m' | 'duracao_s' | 'data'> & { evento_pareado?: string | null }):
  { treino: Candidata; criterio: 'intervals' | 'similaridade'; similaridade: number } | null {
  if (a.evento_pareado) {
    const t = candidatas.find((c) => c.evento && c.evento === a.evento_pareado)
    if (t) return { treino: t, criterio: 'intervals', similaridade: similaridade(planoDe(t), at(a)) ?? 1 }
  }
  let melhor: { treino: Candidata; similaridade: number } | null = null
  for (const c of candidatas) {
    if (Math.abs(diasEntre(c.data, a.data)) > 1) continue
    const s = similaridade(planoDe(c), at(a))
    if (s === null) continue
    const aceita = c.data === a.data ? true : s >= 0.6
    if (aceita && (!melhor || s > melhor.similaridade)) melhor = { treino: c, similaridade: s }
  }
  return melhor ? { ...melhor, criterio: 'similaridade' } : null
}
const planoDe = (c: Candidata): ParaComparar => ({ modalidade: c.modalidade, data: c.data, duracao_s: c.duracao_min ? c.duracao_min * 60 : null, distancia_m: c.distancia_km ? Number(c.distancia_km) * 1000 : null })
const at = (a: Pick<AtividadeMapeada, 'modalidade' | 'distancia_m' | 'duracao_s' | 'data'>): ParaComparar => ({ modalidade: a.modalidade, data: a.data, duracao_s: a.duracao_s, distancia_m: a.distancia_m })
