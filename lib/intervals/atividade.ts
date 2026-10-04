// Atividade do Intervals.icu → execução da ADTRISC (porte de IntervalsActivityMapper)
// e casamento com o treino planejado (porte de ProcessIntervalsActivityAction).
import type { Modalidade } from '@/lib/treinos/tipos'

export type AtividadeMapeada = {
  id: string
  titulo: string | null
  tipo: string
  modalidade: Modalidade
  data: string                 // dia local da atividade
  executado_em: string         // 'YYYY-MM-DDTHH:MM:SS' local
  duracao_s: number | null
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
  zonas: { fc?: number[]; pace?: number[]; potencia?: number[] } | null
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
const zonasArr = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'number') ? (v as number[]) : undefined)

/** null = atividade sem data/ID ou anterior ao corte. */
export function mapearAtividade(raw: Record<string, unknown>, corte?: string): AtividadeMapeada | null {
  const inicio = String(raw.start_date_local ?? '').slice(0, 19)
  const id = raw.id == null ? '' : String(raw.id)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(inicio) || !id) return null
  if (corte && inicio.slice(0, 10) < corte) return null
  const v = num(raw.average_speed)
  const zonas = { fc: zonasArr(raw.icu_hr_zone_times), pace: zonasArr(raw.pace_zone_times), potencia: zonasArr(raw.icu_zone_times) }
  return {
    id, titulo: typeof raw.name === 'string' ? raw.name : null, tipo: String(raw.type ?? ''), modalidade: modalidadeDoTipo(String(raw.type ?? '')),
    data: inicio.slice(0, 10), executado_em: inicio,
    duracao_s: int(raw.moving_time) ?? int(raw.elapsed_time), distancia_m: num(raw.distance),
    velocidade_media_ms: v && v > 0 ? v : null, pace_medio_s_km: v && v > 0 ? Math.round(1000 / v) : null,
    fc_media: int(raw.average_heartrate), fc_max: int(raw.max_heartrate), calorias: int(raw.calories),
    potencia_media_w: int(raw.icu_average_watts), cadencia_media: int(raw.average_cadence), elevacao_m: int(raw.total_elevation_gain),
    tss: num(raw.icu_training_load),
    zonas: zonas.fc || zonas.pace || zonas.potencia ? zonas : null,
  }
}

export type Candidata = { id: string; modalidade: Modalidade; distancia_km: number | null }

/**
 * Treino do dia que a atividade cumpre: mesma modalidade; havendo mais de um,
 * o de distância planejada mais próxima. Sem treino compatível → atividade extra.
 */
export function escolherTreino(candidatas: Candidata[], a: Pick<AtividadeMapeada, 'modalidade' | 'distancia_m'>): Candidata | null {
  const mesmas = candidatas.filter((c) => c.modalidade === a.modalidade)
  if (mesmas.length <= 1) return mesmas[0] ?? null
  if (!a.distancia_m) return mesmas[0]
  return [...mesmas].sort((x, y) => Math.abs(Number(x.distancia_km ?? 0) * 1000 - a.distancia_m!) - Math.abs(Number(y.distancia_km ?? 0) * 1000 - a.distancia_m!))[0]
}
