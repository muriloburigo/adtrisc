// Maturação somática — equações de Mirwald et al. (2002), idênticas às da
// calculadora "Maturity Offset and PHV Calculator" (Science for Sport) que a
// equipe técnica usa. Unidades: cm, kg, anos.
import type { SexoEnum } from '@/types/database'

// Faixas combinadas com a equipe técnica (maturity offset em anos)
export const FAIXAS_MATURACAO: { ate: number; rotulo: string }[] = [
  { ate: -1,       rotulo: 'Pré PHV' },
  { ate: 1,        rotulo: 'Janela do PHV' },
  { ate: 2,        rotulo: 'Pós PHV inicial' },
  { ate: 2.5,      rotulo: 'Pós PHV intermediário' },
  { ate: Infinity, rotulo: 'Pós PHV avançado' },
]

export function classificarMaturacao(offset: number): string {
  return FAIXAS_MATURACAO.find((f) => offset < f.ate)!.rotulo
}

function ultimoDiaFevereiro(d: Date) {
  return d.getUTCMonth() === 1 && new Date(Date.UTC(d.getUTCFullYear(), 2, 0)).getUTCDate() === d.getUTCDate()
}

/** YEARFRAC do Excel na base padrão (0, 30/360 US) — a que a calculadora usa. */
export function yearfrac(inicio: string, fim: string): number {
  const a = new Date(`${inicio.slice(0, 10)}T00:00:00Z`)
  const b = new Date(`${fim.slice(0, 10)}T00:00:00Z`)
  let d1 = a.getUTCDate()
  let d2 = b.getUTCDate()
  if (ultimoDiaFevereiro(a) && ultimoDiaFevereiro(b)) d2 = 30
  if (ultimoDiaFevereiro(a)) d1 = 30
  if (d2 === 31 && d1 >= 30) d2 = 30
  if (d1 === 31) d1 = 30
  const dias = (b.getUTCFullYear() - a.getUTCFullYear()) * 360 + (b.getUTCMonth() - a.getUTCMonth()) * 30 + (d2 - d1)
  return dias / 360
}

export type EntradaMaturacao = {
  sexo: SexoEnum | null
  dataNascimento: string | null
  dataAvaliacao: string
  estaturaCm: number | null
  massaKg: number | null
  sentadoCm: number | null      // como foi medido (do chão, se houve banco)
  alturaBancoCm: number | null  // null/0 = medida já é o tronco
}

export type ResultadoMaturacao = {
  offset: number          // anos em relação ao pico de velocidade de crescimento
  idadePhv: number        // idade prevista do PHV
  classificacao: string
}

/** Retorna null quando falta algum dado (sexo, nascimento, estatura, massa ou altura sentado). */
export function calcularMaturacao(e: EntradaMaturacao): ResultadoMaturacao | null {
  if (!e.sexo || !e.dataNascimento || !e.estaturaCm || !e.massaKg || !e.sentadoCm) return null
  const idade = yearfrac(e.dataNascimento, e.dataAvaliacao)
  const sentado = e.sentadoCm - (e.alturaBancoCm ?? 0)
  const perna = e.estaturaCm - sentado
  const pesoEstatura = (e.massaKg / e.estaturaCm) * 100
  const offset = e.sexo === 'F'
    ? -9.376 + 0.0001882 * perna * sentado + 0.0022 * idade * perna + 0.005841 * idade * sentado
      - 0.002658 * idade * e.massaKg + 0.07693 * pesoEstatura
    : -9.236 + 0.0002708 * perna * sentado - 0.001663 * idade * perna + 0.007216 * idade * sentado
      + 0.02292 * pesoEstatura
  const arred = Math.round(offset * 100) / 100
  return { offset: arred, idadePhv: Math.round((idade - offset) * 10) / 10, classificacao: classificarMaturacao(arred) }
}
