// Treino → texto no formato do Intervals.icu (porte do IntervalsWorkoutBuilderService
// do Movelly Core), usado na "Visão geral" do montador e no envio ao Intervals.
//
// Sintaxe (forum.intervals.icu "Workout Builder Syntax Quick Guide"):
//   - "m" = MINUTOS; metros = "mtr" (500mtr), quilômetros = "km".
//     O Movelly escrevia "<1000m" como "400m" (= 400 minutos!) — corrigido aqui.
//   - pace absoluto: "4:30-4:50/km Pace" (natação: "/100m Pace")
//   - FC: "75-80% HR" (% da FC máx.) · potência: "200-220w"
//   - texto antes da duração vira a dica do passo no relógio.
// Com a referência do atleta, zonas viram o pace DELE (as zonas da ADTRISC não
// existem no Intervals); sem atleta (visão da turma), o texto só nomeia a zona.
import { faixaZona, type Referencia } from './calculos'
import type { Modalidade, Passo } from './tipos'

const TIPO_INTERVALS: Record<Modalidade, string> = {
  running: 'Run', cycling: 'Ride', swimming: 'Swim', strength: 'WeightTraining', other: 'Workout',
}

export type ContextoAtleta = {
  referencia?: Referencia | null  // 100% = velocidade do teste
  limites?: number[]              // config_avaliacao.zona_limites
  fcMax?: number | null
}

const mmss = (s: number) => {
  const t = Math.round(s)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

function duracao(p: Passo): string {
  if (p.distancia_m) {
    return p.distancia_m >= 1000 && p.distancia_m % 100 === 0
      ? `${Number((p.distancia_m / 1000).toFixed(2))}km`
      : `${p.distancia_m}mtr`
  }
  if (p.duracao_s) {
    const m = Math.floor(p.duracao_s / 60), s = p.duracao_s % 60
    return m && s ? `${m}m${s}s` : m ? `${m}m` : `${s}s`
  }
  return ''
}

/** Faixa de pace (texto do Intervals) para uma velocidade mín/máx em m/s. */
function pace(vMin: number, vMax: number, modalidade: Modalidade): string {
  const unidade = modalidade === 'swimming' ? 100 : 1000
  const sufixo = modalidade === 'swimming' ? '/100m' : '/km'
  // pace mais rápido primeiro, como no Intervals
  return `${mmss(unidade / vMax)}-${mmss(unidade / vMin)}${sufixo} Pace`
}

function alvo(p: Passo, modalidade: Modalidade, ctx: ContextoAtleta): { alvo: string; dica: string } {
  if (p.alvo_min === null && p.alvo_max === null) return { alvo: '', dica: '' }
  const min = p.alvo_min ?? p.alvo_max!
  const max = p.alvo_max ?? p.alvo_min!
  switch (p.alvo_unidade) {
    case 'zone': {
      // Faixa de zonas (ex.: Z1–Z2): do piso da primeira ao teto da última.
      const z1 = Math.round(Math.min(min, max)), z2 = Math.round(Math.max(min, max))
      const rotulo = z1 === z2 ? `Z${z1}` : `Z${z1}-Z${z2}`
      const ref = ctx.referencia
      const pMin = faixaZona(z1, ctx.limites).min, pMax = faixaZona(z2, ctx.limites).max
      if (ref && (modalidade === 'running' || modalidade === 'swimming')) {
        return { alvo: pace(ref.velocidade_ms * pMin / 100, ref.velocidade_ms * pMax / 100, modalidade), dica: rotulo }
      }
      if (ref && modalidade === 'cycling') {
        const kmh = (pct: number) => (ref.velocidade_ms * pct / 100 * 3.6).toFixed(0)
        return { alvo: '', dica: `${rotulo} ${kmh(pMin)}-${kmh(pMax)}km/h` }
      }
      return { alvo: '', dica: rotulo }
    }
    case 'pace':
      return { alvo: `${mmss(Math.min(min, max))}${min !== max ? `-${mmss(Math.max(min, max))}` : ''}${modalidade === 'swimming' ? '/100m' : '/km'} Pace`, dica: '' }
    case 'bpm':
      if (ctx.fcMax) {
        const pct = (b: number) => Math.round((b / ctx.fcMax!) * 100)
        return { alvo: `${pct(min)}${min !== max ? `-${pct(max)}` : ''}% HR`, dica: '' }
      }
      return { alvo: '', dica: `FC ${min}${min !== max ? `-${max}` : ''}` }
    case 'w':
      return { alvo: `${min}${min !== max ? `-${max}` : ''}w`, dica: '' }
    case 'kmh':
      return { alvo: '', dica: `${min}${min !== max ? `-${max}` : ''}km/h` }
    case 'rpe':
      return { alvo: '', dica: `PSE ${min}` }
    default:
      return { alvo: '', dica: '' }
  }
}

function linhaPasso(p: Passo, modalidade: Modalidade, ctx: ContextoAtleta): string {
  const a = alvo(p, modalidade, ctx)
  const dica = [p.titulo, a.dica].filter(Boolean).join(' ').trim()
  const dur = p.aberto && !p.distancia_m && !p.duracao_s ? 'lap' : duracao(p)
  return [dica, dur, a.alvo].filter(Boolean).join(' ').trim()
}

/** Linhas do treino (uma por passo; repetições como "Nx" + sub-passos). */
export function linhasIntervals(passos: Passo[], modalidade: Modalidade, ctx: ContextoAtleta = {}): string[] {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem).filter((p) => p.tipo !== 'note')
  const linhas: string[] = []
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    const reps = p.repeticoes ?? 1
    if (reps > 1) {
      const descanso = ord[i + 1]?.tipo === 'recovery' ? ord[i + 1] : null
      linhas.push('', `${reps}x`, `- ${linhaPasso(p, modalidade, ctx)}`)
      if (descanso) { linhas.push(`- ${linhaPasso(descanso, modalidade, ctx)}`); i++ }
      linhas.push('')
    } else {
      linhas.push(`- ${linhaPasso(p, modalidade, ctx)}`)
    }
  }
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim().split('\n')
}

/** Evento para POST /api/v1/athlete/{id}/events (como no Movelly). */
export function eventoIntervals(s: {
  id: string; titulo: string; modalidade: Modalidade; data: string; notas?: string | null; passos: Passo[]
}, ctx: ContextoAtleta) {
  const linhas = linhasIntervals(s.passos, s.modalidade, ctx)
  const notas = s.notas?.trim()
  return {
    category: 'WORKOUT',
    type: TIPO_INTERVALS[s.modalidade],
    name: s.titulo,
    description: [notas, linhas.join('\n')].filter(Boolean).join('\n\n'),
    start_date_local: `${s.data}T00:00:00`,
    external_id: `adtrisc-sessao-${s.id}`,
  }
}
