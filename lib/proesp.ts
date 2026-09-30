// Classificação PROESP-Br — Manual de medidas, testes e avaliações, versão 2021
// (Gaya et al., UFRGS). Tabelas por sexo e idade (6 a 17 anos), índice = idade - 6.
// Unidades como no manual: cm para medicine ball e salto (o banco guarda em m).
import type { AvaliacaoFisicaRow, SexoEnum } from '@/types/database'

export type NivelDesempenho = 'Fraco' | 'Razoável' | 'Bom' | 'Muito bom' | 'Excelência'
export type ZonaSaude = 'saudavel' | 'risco'
export type ClassificacaoTeste = { saude?: ZonaSaude; desempenho?: NivelDesempenho }

type PorSexo<T> = { M: T[]; F: T[] }

// ── 6. Aptidão física relacionada à saúde (pontos de corte) ──────────────────
// "acima" = valores acima do corte são zona de risco; "abaixo" = abaixo do corte é risco.
const SAUDE: Record<string, { sentido: 'acima' | 'abaixo'; corte: PorSexo<number> }> = {
  imc: { sentido: 'acima', corte: {
    M: [17.7, 17.8, 19.2, 19.3, 20.7, 22.1, 22.2, 22.0, 22.2, 23.0, 24.0, 25.4],
    F: [17.0, 17.1, 18.2, 19.1, 20.9, 22.3, 22.6, 22.0, 22.0, 22.4, 24.0, 24.0],
  } },
  resistencia_6min: { sentido: 'abaixo', corte: {
    M: [675, 730, 768, 820, 856, 930, 966, 995, 1060, 1130, 1190, 1190],
    F: [630, 683, 715, 745, 790, 840, 900, 940, 985, 1005, 1070, 1110],
  } },
  sentar_alcancar: { sentido: 'abaixo', corte: {
    M: [29, 29, 32.5, 29, 29.5, 29.5, 29.5, 26.5, 30.5, 31, 34.5, 34],
    F: [40.5, 40.5, 39.5, 35, 36.5, 34.5, 39.5, 38.5, 38.5, 38.5, 39.5, 39.5],
  } },
  forca_abdominal: { sentido: 'abaixo', corte: {
    M: [18, 18, 24, 26, 31, 37, 41, 42, 43, 45, 46, 47],
    F: [18, 18, 18, 20, 26, 30, 30, 33, 34, 34, 34, 34],
  } },
  arremesso_medicineball: { sentido: 'abaixo', corte: {
    M: [147, 168.7, 190, 210, 232, 260, 290, 335, 400, 440, 480, 500],
    F: [125, 140, 158.1, 175, 202, 228, 260, 280, 290, 306, 310, 315],
  } },
  corrida_20m: { sentido: 'acima', corte: {
    M: [4.81, 4.52, 4.31, 4.25, 4.09, 4.00, 3.88, 3.72, 3.54, 3.40, 3.28, 3.22],
    F: [5.22, 4.88, 4.66, 4.58, 4.44, 4.36, 4.28, 4.17, 4.16, 4.07, 4.01, 3.91],
  } },
}
const RCE_CORTE = 0.5 // igual para todas as idades e sexos; acima é risco

// ── 7. Desempenho motor (normas por percentil) ──────────────────────────────
// "maior": limites inferiores de [Razoável, Bom, Muito bom, Excelência].
// "menor" (tempo): limites superiores de [Excelência, Muito bom, Bom, Razoável].
// Correções de digitação do PDF: Excelência do salto aparece com "≤" (é "≥");
// Excelência feminina de abdominal/flexibilidade repete o topo do Muito bom
// (usado o valor seguinte, como nas tabelas masculinas).
type Quad = [number, number, number, number]
const DESEMPENHO: Record<string, { sentido: 'maior' | 'menor'; limites: PorSexo<Quad> }> = {
  resistencia_6min: { sentido: 'maior', limites: {
    M: [[730, 827, 956, 1317], [752, 849, 975, 1303], [774, 871, 995, 1301], [797, 895, 1018, 1310],
        [817, 917, 1040, 1323], [837, 939, 1062, 1339], [860, 965, 1090, 1367], [895, 1005, 1136, 1422],
        [939, 1058, 1197, 1499], [986, 1113, 1262, 1585], [1015, 1149, 1306, 1644], [1038, 1177, 1341, 1692]],
    F: [[672, 768, 901, 1277], [691, 780, 892, 1159], [707, 792, 896, 1132], [720, 806, 911, 1149],
        [729, 819, 932, 1200], [736, 832, 954, 1251], [743, 836, 948, 1192], [749, 840, 948, 1179],
        [751, 848, 970, 1257], [748, 859, 1006, 1391], [746, 866, 1022, 1402], [744, 871, 1028, 1390]],
  } },
  sentar_alcancar: { sentido: 'maior', limites: {
    M: [[34.3, 41.3, 50.4, 74.0], [33.3, 39.7, 48.0, 68.5], [32.3, 38.4, 46.0, 64.0], [31.3, 37.2, 44.6, 61.5],
        [30.4, 36.5, 43.9, 60.8], [29.8, 35.7, 43.0, 59.3], [29.4, 35.2, 42.2, 57.9], [29.1, 35.3, 42.9, 60.6],
        [28.7, 35.7, 44.8, 67.2], [28.4, 36.4, 47.0, 73.8], [28.4, 36.8, 48.1, 76.6], [28.7, 36.9, 48.0, 76.2]],
    F: [[37.0, 43.9, 52.6, 73.5], [35.3, 41.9, 50.0, 69.2], [33.8, 40.1, 47.9, 65.8], [32.4, 38.7, 46.3, 63.7],
        [31.3, 37.6, 45.4, 62.7], [30.6, 36.8, 44.3, 61.1], [30.4, 36.4, 43.7, 60.2], [30.3, 36.7, 44.6, 63.0],
        [30.1, 37.3, 46.6, 69.6], [29.6, 37.9, 48.9, 77.2], [29.2, 37.9, 49.6, 80.2], [28.9, 37.5, 49.0, 79.1]],
  } },
  forca_abdominal: { sentido: 'maior', limites: {
    M: [[18, 23, 28, 39], [20, 26, 31, 43], [23, 28, 34, 46], [25, 30, 36, 48], [26, 32, 37, 49], [27, 33, 39, 50],
        [29, 35, 40, 52], [30, 36, 42, 54], [32, 38, 44, 57], [34, 40, 47, 60], [35, 42, 48, 62], [36, 43, 49, 63]],
    F: [[17, 22, 27, 38], [19, 24, 30, 41], [20, 26, 32, 44], [21, 27, 33, 46], [22, 28, 34, 46], [23, 29, 34, 47],
        [23, 29, 35, 47], [24, 30, 36, 49], [24, 30, 36, 50], [24, 30, 36, 50], [23, 30, 36, 50], [23, 30, 36, 49]],
  } },
  arremesso_medicineball: { sentido: 'maior', limites: {
    M: [[136.2, 155.0, 180.4, 249.0], [154.9, 175.6, 201.4, 261.4], [173.4, 195.9, 223.3, 284.3], [192.2, 216.8, 247.0, 315.3],
        [209.2, 235.7, 268.8, 345.4], [230.1, 259.2, 295.1, 376.8], [255.2, 287.7, 327.4, 416.2], [295.6, 334.0, 380.0, 479.7],
        [348.5, 394.0, 446.5, 554.5], [405.1, 456.1, 513.0, 623.5], [448.3, 501.6, 560.1, 670.9], [486.8, 541.2, 600.2, 710.4]],
    F: [[129.7, 146.7, 167.5, 214.9], [141.7, 160.0, 182.1, 230.5], [156.6, 176.5, 200.4, 252.2], [174.1, 195.9, 222.2, 279.6],
        [191.9, 215.6, 244.4, 308.1], [214.3, 240.3, 271.9, 341.9], [236.8, 265.1, 299.0, 372.2], [261.3, 292.2, 328.3, 403.5],
        [283.5, 316.6, 354.5, 431.8], [299.9, 334.2, 373.5, 452.9], [309.7, 344.7, 385.1, 468.1], [318.4, 353.8, 395.6, 484.1]],
  } },
  salto_horizontal: { sentido: 'maior', limites: {
    M: [[100.1, 111.6, 125.7, 158.0], [107.5, 119.0, 133.0, 164.2], [114.7, 126.3, 140.2, 170.7], [122.2, 134.0, 147.9, 178.1],
        [129.6, 141.6, 155.8, 185.9], [136.6, 148.9, 163.3, 193.4], [143.1, 155.9, 170.6, 201.2], [152.6, 166.2, 181.9, 213.9],
        [164.0, 178.9, 195.8, 230.0], [175.3, 191.4, 209.5, 245.6], [182.6, 199.4, 218.2, 255.3], [188.5, 205.9, 225.1, 262.6]],
    F: [[88.3, 99.3, 112.9, 143.2], [96.2, 107.4, 120.9, 151.1], [103.5, 114.7, 128.4, 158.5], [110.8, 122.2, 136.0, 166.3],
        [117.7, 129.3, 143.4, 174.1], [123.9, 135.9, 150.4, 181.8], [128.0, 140.4, 155.4, 187.7], [130.8, 143.8, 159.4, 193.1],
        [132.0, 145.7, 162.0, 197.4], [131.8, 146.3, 163.6, 200.8], [131.2, 146.3, 164.4, 203.3], [130.5, 146.3, 165.2, 205.7]],
  } },
  agilidade: { sentido: 'menor', limites: {
    M: [[6.20, 7.10, 7.60, 8.07], [6.01, 6.90, 7.39, 7.85], [5.85, 6.71, 7.20, 7.65], [5.69, 6.53, 7.00, 7.45],
        [5.54, 6.35, 6.81, 7.25], [5.37, 6.15, 6.60, 7.02], [5.22, 5.98, 6.41, 6.82], [5.08, 5.80, 6.22, 6.62],
        [4.93, 5.62, 6.03, 6.42], [4.76, 5.42, 5.81, 6.19], [4.62, 5.24, 5.62, 5.99], [4.47, 5.07, 5.43, 5.79]],
    F: [[6.67, 7.67, 8.26, 8.85], [6.32, 7.35, 7.93, 8.47], [6.09, 7.09, 7.64, 8.15], [5.97, 6.87, 7.37, 7.85],
        [5.81, 6.66, 7.14, 7.60], [5.67, 6.49, 6.95, 7.39], [5.61, 6.37, 6.82, 7.27], [5.47, 6.25, 6.70, 7.15],
        [5.32, 6.11, 6.58, 7.05], [5.21, 6.00, 6.48, 6.97], [5.12, 5.92, 6.42, 6.92], [5.02, 5.84, 6.36, 6.88]],
  } },
  corrida_20m: { sentido: 'menor', limites: {
    M: [[3.61, 4.21, 4.57, 4.94], [3.52, 4.08, 4.42, 4.75], [3.44, 3.97, 4.28, 4.59], [3.37, 3.86, 4.15, 4.44],
        [3.30, 3.76, 4.03, 4.30], [3.22, 3.65, 3.91, 4.16], [3.14, 3.56, 3.80, 4.04], [3.04, 3.44, 3.68, 3.91],
        [2.92, 3.30, 3.54, 3.78], [2.78, 3.16, 3.39, 3.63], [2.68, 3.05, 3.28, 3.53], [2.58, 2.95, 3.19, 3.43]],
    F: [[3.98, 4.56, 4.91, 5.27], [3.84, 4.39, 4.72, 5.05], [3.72, 4.23, 4.55, 4.86], [3.60, 4.09, 4.39, 4.68],
        [3.50, 3.97, 4.25, 4.53], [3.41, 3.86, 4.14, 4.41], [3.34, 3.79, 4.06, 4.33], [3.27, 3.73, 4.00, 4.28],
        [3.20, 3.67, 3.96, 4.25], [3.11, 3.61, 3.91, 4.22], [3.03, 3.55, 3.87, 4.21], [2.95, 3.49, 3.83, 4.19]],
  } },
}

const EM_CM = new Set(['arremesso_medicineball', 'salto_horizontal']) // banco em m, manual em cm

export const IDADE_MIN = 6
export const IDADE_MAX = 17

function nivel(valor: number, sentido: 'maior' | 'menor', q: Quad): NivelDesempenho {
  if (sentido === 'maior') {
    if (valor < q[0]) return 'Fraco'
    if (valor < q[1]) return 'Razoável'
    if (valor < q[2]) return 'Bom'
    if (valor < q[3]) return 'Muito bom'
    return 'Excelência'
  }
  if (valor <= q[0]) return 'Excelência'
  if (valor <= q[1]) return 'Muito bom'
  if (valor <= q[2]) return 'Bom'
  if (valor <= q[3]) return 'Razoável'
  return 'Fraco'
}

/**
 * Classifica cada teste da avaliação. `idade` = anos completos na data da avaliação.
 * Retorna {} fora da faixa 6–17 anos ou sem sexo.
 */
export function classificarProesp(
  av: Partial<AvaliacaoFisicaRow>,
  sexo: SexoEnum | null,
  idade: number | null,
): Record<string, ClassificacaoTeste> {
  if (!sexo || idade == null || idade < IDADE_MIN || idade > IDADE_MAX) return {}
  const i = idade - IDADE_MIN
  const out: Record<string, ClassificacaoTeste> = {}
  const valorDe = (campo: string) => {
    const v = av[campo as keyof AvaliacaoFisicaRow] as number | null | undefined
    return v == null ? null : EM_CM.has(campo) ? v * 100 : v
  }
  for (const [campo, regra] of Object.entries(SAUDE)) {
    const v = valorDe(campo)
    if (v == null) continue
    const corte = regra.corte[sexo][i]
    const risco = regra.sentido === 'acima' ? v > corte : v < corte
    ;(out[campo] ??= {}).saude = risco ? 'risco' : 'saudavel'
  }
  if (av.rce != null) (out.rce ??= {}).saude = av.rce > RCE_CORTE ? 'risco' : 'saudavel'
  for (const [campo, regra] of Object.entries(DESEMPENHO)) {
    const v = valorDe(campo)
    if (v == null) continue
    ;(out[campo] ??= {}).desempenho = nivel(v, regra.sentido, regra.limites[sexo][i])
  }
  return out
}
