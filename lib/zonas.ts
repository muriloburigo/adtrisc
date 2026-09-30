// Zonas de treino calculadas a partir dos testes de campo:
// corrida → Dabonneville 5' (distância em m) · ciclismo → 2 km (tempo em s).
// Os limites são % da velocidade média do teste (configuráveis em config_avaliacao).

export const ZONA_LIMITES_PADRAO = [65, 75, 85, 95, 120]
export const NOMES_ZONA = ['Muito leve', 'Leve', 'Moderado', 'Forte', 'Muito forte']

export type Zona = {
  zona: number          // 1..5
  pctMin: number | null // null na Z1 ("até X%")
  pctMax: number
  // velocidade em m/s nos limites (min = mais lento)
  vMin: number | null
  vMax: number
}

function montarZonas(vRef: number, limites: number[]): Zona[] {
  return limites.map((max, i) => {
    const min = i === 0 ? null : limites[i - 1]
    return { zona: i + 1, pctMin: min, pctMax: max, vMin: min == null ? null : (vRef * min) / 100, vMax: (vRef * max) / 100 }
  })
}

/** Dabonneville: distância percorrida em 5 minutos. */
export function zonasCorrida(distancia5minM: number, limites = ZONA_LIMITES_PADRAO) {
  const v = distancia5minM / 300
  return { v, kmh: v * 3.6, paceSKm: 1000 / v, zonas: montarZonas(v, limites) }
}

/** Ciclismo: tempo (s) para 2 km. */
export function zonasCiclismo(tempo2kmS: number, limites = ZONA_LIMITES_PADRAO) {
  const v = 2000 / tempo2kmS
  return { v, kmh: v * 3.6, zonas: montarZonas(v, limites) }
}

/** Tempo (s) para percorrer `metros` na velocidade `v` (m/s). */
export const tempoPara = (metros: number, v: number) => metros / v

/** 225.4 → "3:45" (arredonda para o segundo) */
export function minSeg(segundos: number): string {
  const t = Math.round(segundos)
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

export const kmhFmt = (v: number) => (v * 3.6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Faixa de uma zona para exibir. Tempo (pace/400 m/200 m): o limite mais rápido
 * vem primeiro, como na planilha da equipe ("3:24 – 3:47"). Na Z1 não há limite
 * inferior de velocidade, então vira "acima de X" (tempo) / "até X" (velocidade).
 */
export function faixaTempo(z: Zona, metros: number): string {
  const rapido = minSeg(tempoPara(metros, z.vMax))
  return z.vMin == null ? `acima de ${rapido}` : `${rapido} – ${minSeg(tempoPara(metros, z.vMin))}`
}

export function faixaVelocidade(z: Zona): string {
  return z.vMin == null ? `até ${kmhFmt(z.vMax)}` : `${kmhFmt(z.vMin)} – ${kmhFmt(z.vMax)}`
}
