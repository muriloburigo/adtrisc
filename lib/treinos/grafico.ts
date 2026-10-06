// Gráfico de intensidade do treino — porte do `chartBars` (pages-training-calendar.js)
// e do zone-bar-chart do Movelly. Largura de cada barra = TEMPO (distância vira
// tempo pelo pace do atleta na intensidade do passo); altura = % da velocidade
// de referência (100% = teste/limiar), até 130%. As barras de um mesmo bloco
// (todas as repetições + descansos) compartilham `bloco`, para destacar juntas.
import { faixaZona, formatarDuracao, formatarVelocidade, type Referencia } from './calculos'
import { textoAlvo } from './descricao'
import { CORES_ZONA, TIPOS_PASSO, type Modalidade, type Passo } from './tipos'

export type Barra = { id: number; bloco: number; flex: number; pct: number; cor: string; dica: { titulo: string; linha2: string; linha3: string; cor: string } }

const LIMITES_PADRAO = [65, 75, 85, 95, 120]
const PSE_PCT = [55, 68, 80, 92, 108]

/** % da referência no meio do alvo do passo, e a zona correspondente. */
function intensidade(p: Passo, ref: Referencia | null, limites: number[]): { pct: number; zona: number } {
  const zonaDePct = (pct: number) => Math.min(5, 1 + limites.filter((l) => pct > l).length)
  if (p.alvo_min != null) {
    const max = p.alvo_max ?? p.alvo_min
    if (p.alvo_unidade === 'zone') {
      const z1 = Math.round(Math.min(p.alvo_min, max)), z2 = Math.round(Math.max(p.alvo_min, max))
      const pct = (faixaZona(z1, limites).min + faixaZona(z2, limites).max) / 2
      return { pct, zona: Math.round((z1 + z2) / 2) }
    }
    if (p.alvo_unidade === 'rpe') { const n = Math.min(5, Math.max(1, Math.round(p.alvo_min))); return { pct: PSE_PCT[n - 1], zona: n } }
    if (ref && (p.alvo_unidade === 'pace' || p.alvo_unidade === 'kmh')) {
      const un = ref.modalidade === 'swimming' ? 100 : 1000
      const v = p.alvo_unidade === 'pace' ? un / ((p.alvo_min + max) / 2) : ((p.alvo_min + max) / 2) / 3.6
      const pct = (v / ref.velocidade_ms) * 100
      return { pct, zona: zonaDePct(pct) }
    }
  }
  if (p.tipo === 'warmup' || p.tipo === 'cooldown' || p.tipo === 'recovery') return { pct: 55, zona: 1 }
  return { pct: 70, zona: 2 }
}

function segundos(p: Passo, pct: number, ref: Referencia | null): number {
  if (p.duracao_s) return p.duracao_s
  if (p.distancia_m) {
    const v = ref ? ref.velocidade_ms * pct / 100 : 3
    return p.distancia_m / Math.max(0.3, v)
  }
  return 60 // passo livre (até a volta)
}

const volume = (p: Passo) => (p.distancia_m ? (p.distancia_m >= 1000 && p.distancia_m % 100 === 0 ? `${(p.distancia_m / 1000).toLocaleString('pt-BR')} km` : `${p.distancia_m} m`) : p.duracao_s ? formatarDuracao(p.duracao_s) : 'livre')
const rotZona = (p: Passo, modalidade: Modalidade, ctx: { referencia: Referencia | null; limites: number[] }) =>
  textoAlvo({ tipo: p.intensidade_tipo ?? 'open', min: p.alvo_min, max: p.alvo_max, unidade: p.alvo_unidade }, modalidade, ctx).texto

export function barrasDoTreino(passos: Passo[], modalidade: Modalidade, referencia: Referencia | null, limites: number[] = LIMITES_PADRAO): Barra[] {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem).filter((p) => p.tipo !== 'note')
  const ctx = { referencia, limites }
  const barras: Barra[] = []
  let id = 0, bloco = 0
  const corDe = (z: number) => CORES_ZONA[Math.min(5, Math.max(1, z)) - 1]
  const ritmo = (p: Passo) => {
    const t = rotZona(p, modalidade, ctx)
    const m = t.match(/\(([^)]+)\)/)
    return m ? m[1] : t
  }
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    const n = p.repeticoes ?? 1
    const ip = intensidade(p, referencia, limites)
    if (n > 1) {
      const d = ord[i + 1]?.tipo === 'recovery' ? ord[++i] : null
      const id_ = d ? intensidade(d, referencia, limites) : null
      const dica = {
        titulo: TIPOS_PASSO[p.tipo] ?? 'Bloco',
        linha2: `${n}× ${volume(p)} Z${ip.zona}${d ? ` / ${volume(d)} Z${id_!.zona}` : ''}`,
        linha3: ritmo(p), cor: corDe(ip.zona),
      }
      for (let k = 0; k < n; k++) {
        barras.push({ id: id++, bloco, flex: segundos(p, ip.pct, referencia), pct: Math.min(130, ip.pct), cor: corDe(ip.zona), dica })
        if (d && id_ && k < n - 1) barras.push({ id: id++, bloco, flex: segundos(d, id_.pct, referencia), pct: Math.min(130, id_.pct), cor: corDe(id_.zona), dica })
      }
    } else {
      const zonaTxt = rotZona(p, modalidade, ctx).split(' (')[0]
      barras.push({
        id: id++, bloco, flex: segundos(p, ip.pct, referencia), pct: Math.min(130, ip.pct), cor: corDe(ip.zona),
        dica: { titulo: p.titulo || TIPOS_PASSO[p.tipo], linha2: `${volume(p)}${zonaTxt ? ` · ${zonaTxt}` : ''}`, linha3: ritmo(p), cor: corDe(ip.zona) },
      })
    }
    bloco++
  }
  return barras
}

export const velocidadeTxt = formatarVelocidade
