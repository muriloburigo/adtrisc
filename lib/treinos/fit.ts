// Arquivos FIT (Garmin) — porte de FitBinaryReader, FitWorkoutEncoder,
// FitWorkoutGeneratorService, FitWorkoutParserService, FitWorkoutTargetResolver
// e FitActivityParserService do Movelly, sem dependências.
// Diferenças de propósito: o leitor trata developer fields (o do Movelly se
// perdia em arquivos Garmin modernos), valores inválidos e campos em lista
// (tempo por zona); zona → faixa de VELOCIDADE do atleta (zonas da ADTRISC
// são % do teste), e não "zona de FC do relógio".
// Referência: https://developer.garmin.com/fit/cookbook/

import { faixaZona, type Referencia } from './calculos'
import type { Modalidade, Passo, TipoPasso } from './tipos'

const EPOCA_FIT = 631065600 // segundos entre 1970-01-01 e 1989-12-31 UTC
const CRC = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400]

export function crc16(bytes: Uint8Array, crc = 0): number {
  for (const b of bytes) {
    let t = CRC[crc & 0xf]; crc = (crc >> 4) & 0x0fff; crc = crc ^ t ^ CRC[b & 0xf]
    t = CRC[crc & 0xf]; crc = (crc >> 4) & 0x0fff; crc = crc ^ t ^ CRC[(b >> 4) & 0xf]
  }
  return crc
}

// ── Leitor ──────────────────────────────────────────────────────────────────
type Campo = { num: number; tam: number; tipo: number }
type Def = { global: number; le: boolean; campos: Campo[]; dev: number }
export type Mensagem = Record<number, number | number[] | string | null>

const TAM_BASE: Record<number, number> = { 0x00: 1, 0x01: 1, 0x02: 1, 0x0a: 1, 0x0d: 1, 0x83: 2, 0x84: 2, 0x8b: 2, 0x85: 4, 0x86: 4, 0x8c: 4, 0x88: 4, 0x89: 8, 0x8e: 8, 0x8f: 8, 0x90: 8 }
const INVALIDO: Record<number, number> = { 0x00: 0xff, 0x02: 0xff, 0x0a: 0, 0x01: 0x7f, 0x84: 0xffff, 0x8b: 0, 0x83: 0x7fff, 0x86: 0xffffffff, 0x8c: 0, 0x85: 0x7fffffff }

function lerValor(v: DataView, pos: number, tipo: number, le: boolean): number | null {
  let n: number
  switch (tipo) {
    case 0x01: n = v.getInt8(pos); break
    case 0x83: n = v.getInt16(pos, le); break
    case 0x84: case 0x8b: n = v.getUint16(pos, le); break
    case 0x85: n = v.getInt32(pos, le); break
    case 0x86: case 0x8c: n = v.getUint32(pos, le); break
    case 0x88: n = v.getFloat32(pos, le); break
    case 0x89: n = v.getFloat64(pos, le); break
    case 0x8e: case 0x8f: case 0x90: n = Number(v.getBigUint64(pos, le)); break
    default: n = v.getUint8(pos)
  }
  return INVALIDO[tipo] !== undefined && n === INVALIDO[tipo] && tipo !== 0x0a && tipo !== 0x8b && tipo !== 0x8c ? null : n
}

/** Mensagens cujo número global está em `globais` (ou todas). null = não é um FIT válido. */
export function lerMensagens(buf: Uint8Array, globais?: number[]): { global: number; campos: Mensagem }[] | null {
  if (buf.length < 14) return null
  const tamCab = buf[0]
  if (tamCab < 12 || String.fromCharCode(...buf.slice(8, 12)) !== '.FIT') return null
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const fim = Math.min(tamCab + v.getUint32(4, true), buf.length)
  const defs = new Map<number, Def>()
  const out: { global: number; campos: Mensagem }[] = []
  let p = tamCab
  try {
    while (p < fim) {
      const cab = buf[p++]
      if (cab & 0x80) { // timestamp comprimido
        const d = defs.get((cab >> 5) & 0x03)
        if (!d) break
        p += d.campos.reduce((t, c) => t + c.tam, 0) + d.dev
        continue
      }
      const local = cab & 0x0f
      if (cab & 0x40) {
        const le = buf[p + 1] === 0
        const global = v.getUint16(p + 2, le)
        const n = buf[p + 4]
        p += 5
        const campos: Campo[] = []
        for (let i = 0; i < n; i++, p += 3) campos.push({ num: buf[p], tam: buf[p + 1], tipo: buf[p + 2] })
        let dev = 0
        if (cab & 0x20) { const nd = buf[p++]; for (let i = 0; i < nd; i++, p += 3) dev += buf[p + 1] }
        defs.set(local, { global, le, campos, dev })
        continue
      }
      const d = defs.get(local)
      if (!d) break
      const quer = !globais || globais.includes(d.global)
      const msg: Mensagem = {}
      for (const c of d.campos) {
        if (quer) {
          if (c.tipo === 0x07) msg[c.num] = new TextDecoder().decode(buf.slice(p, p + c.tam)).split('\0')[0]
          else {
            const t = TAM_BASE[c.tipo] ?? 1
            if (c.tam === t) msg[c.num] = lerValor(v, p, c.tipo, d.le)
            else if (c.tam % t === 0) msg[c.num] = Array.from({ length: c.tam / t }, (_, i) => lerValor(v, p + i * t, c.tipo, d.le) ?? 0)
          }
        }
        p += c.tam
      }
      p += d.dev
      if (quer) out.push({ global: d.global, campos: msg })
    }
  } catch {
    // Arquivo truncado: devolve o que deu para ler.
  }
  return out
}

// ── Atividade (o que foi feito) ─────────────────────────────────────────────
export type AtividadeFit = {
  executado_em: string | null; modalidade: Modalidade; duracao_s: number | null; distancia_m: number | null
  velocidade_media_ms: number | null; pace_medio_s_km: number | null; fc_media: number | null; fc_max: number | null
  potencia_media_w: number | null; calorias: number | null; cadencia_media: number | null; zonas: { fc?: number[] } | null
}
const ESPORTE: Record<number, Modalidade> = { 1: 'running', 2: 'cycling', 5: 'swimming', 4: 'strength', 10: 'strength' }

export function lerAtividadeFit(buf: Uint8Array): AtividadeFit | null {
  const msgs = lerMensagens(buf, [18, 0])
  if (!msgs) return null
  const s = msgs.find((m) => m.global === 18)?.campos
  if (!s) return null
  const n = (k: number) => (typeof s[k] === 'number' ? (s[k] as number) : null)
  const dur = n(7) ?? n(8)
  const dist = n(9)
  const vel = n(124) ?? n(14)
  const v = vel ? vel / 1000 : dist && dur ? (dist / 100) / (dur / 1000) : null
  const zonasFc = Array.isArray(s[65]) ? (s[65] as number[]).map((x) => Math.round(x / 1000)) : undefined
  return {
    executado_em: n(2) != null ? new Date((n(2)! + EPOCA_FIT) * 1000).toISOString() : null,
    modalidade: ESPORTE[n(5) ?? -1] ?? 'other',
    duracao_s: dur != null ? Math.round(dur / 1000) : null,
    distancia_m: dist != null ? Math.round(dist) / 100 : null,
    velocidade_media_ms: v && v > 0 ? Math.round(v * 1000) / 1000 : null,
    pace_medio_s_km: v && v > 0 ? Math.round(1000 / v) : null,
    fc_media: n(16), fc_max: n(17), potencia_media_w: n(20), calorias: n(11), cadencia_media: n(18),
    zonas: zonasFc?.some((x) => x > 0) ? { fc: zonasFc } : null,
  }
}

// ── Treino (estrutura) → FIT ────────────────────────────────────────────────
const SPORT_FIT: Partial<Record<Modalidade, number>> = { running: 1, cycling: 2, swimming: 5, strength: 4 }
const U32 = 0xffffffff
type PassoFit = { nome: string; durTipo: number; durValor: number; alvoTipo: number; alvoValor: number; baixo: number; alto: number; intensidade: number }

function intensidadeFit(t: TipoPasso) { return t === 'warmup' ? 2 : t === 'cooldown' ? 3 : t === 'recovery' ? 1 : 0 }

function alvoFit(p: Passo, ref: Referencia | null, limites?: number[]): [number, number, number, number] {
  const aberto: [number, number, number, number] = [2, 0, U32, U32]
  if (p.alvo_min === null || !p.intensidade_tipo || ['open', 'rpe'].includes(p.intensidade_tipo)) return aberto
  const max = p.alvo_max ?? p.alvo_min
  const mms = (ms: number) => Math.round(ms * 1000)
  switch (p.alvo_unidade) {
    case 'zone': {
      if (!ref) return [1, Math.round(p.alvo_min), U32, U32] // sem atleta: zona de FC do relógio (como o Movelly)
      const z1 = Math.min(p.alvo_min, max), z2 = Math.max(p.alvo_min, max)
      return [0, 0, mms(ref.velocidade_ms * faixaZona(z1, limites).min / 100), mms(ref.velocidade_ms * faixaZona(z2, limites).max / 100)]
    }
    case 'pace': { // s por km (natação: por 100 m) → velocidade; pace maior = mais lento
      const un = ref?.modalidade === 'swimming' ? 100 : 1000
      return [0, 0, mms(un / Math.max(p.alvo_min, max)), mms(un / Math.min(p.alvo_min, max))]
    }
    case 'kmh': return [0, 0, mms(Math.min(p.alvo_min, max) / 3.6), mms(Math.max(p.alvo_min, max) / 3.6)]
    case 'bpm': return [1, 0, Math.round(p.alvo_min) + 100, Math.round(max) + 100] // FIT: bpm + 100
    case 'w': return [4, 0, Math.round(p.alvo_min) + 1000, Math.round(max) + 1000] // FIT: watts + 1000
    default: return aberto
  }
}

function passosFit(passos: Passo[], ref: Referencia | null, limites?: number[]): PassoFit[] {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem).filter((p) => p.tipo !== 'note')
  const out: PassoFit[] = []
  const um = (p: Passo): PassoFit => {
    const [alvoTipo, alvoValor, baixo, alto] = alvoFit(p, ref, limites)
    const [durTipo, durValor] = p.duracao_s ? [0, p.duracao_s * 1000] : p.distancia_m ? [1, p.distancia_m * 100] : [5, 0]
    return { nome: p.titulo, durTipo, durValor, alvoTipo, alvoValor, baixo, alto, intensidade: intensidadeFit(p.tipo) }
  }
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    if ((p.repeticoes ?? 1) > 1) {
      const inicio = out.length
      out.push(um(p))
      if (ord[i + 1]?.tipo === 'recovery') out.push(um(ord[++i]))
      out.push({ nome: '', durTipo: 6, durValor: p.repeticoes!, alvoTipo: 2, alvoValor: inicio, baixo: U32, alto: U32, intensidade: 0 })
    } else out.push(um(p))
  }
  return out
}

class Escritor {
  partes: number[] = []
  u8(n: number) { this.partes.push(n & 0xff) }
  u16(n: number) { this.u8(n); this.u8(n >> 8) }
  u32(n: number) { this.u16(n & 0xffff); this.u16((n >>> 16) & 0xffff) }
  str(s: string, tam: number) { const b = new TextEncoder().encode(s).slice(0, tam - 1); for (let i = 0; i < tam; i++) this.u8(b[i] ?? 0) }
  def(local: number, global: number, campos: [number, number, number][]) {
    this.u8(0x40 | local); this.u8(0); this.u8(0); this.u16(global); this.u8(campos.length)
    for (const [n, t, b] of campos) { this.u8(n); this.u8(t); this.u8(b) }
  }
}

/** FIT de treino para copiar em GARMIN/Workouts (ou importar no Garmin Connect). */
export function gerarFitTreino(s: { titulo: string; modalidade: Modalidade; passos: Passo[] }, ref: Referencia | null = null, limites?: number[], agora = Date.now()): Uint8Array {
  const passos = passosFit(s.passos, ref, limites)
  const w = new Escritor()
  w.def(0, 0, [[0, 1, 0x00], [1, 2, 0x84], [2, 2, 0x84], [4, 4, 0x86]])
  w.u8(0); w.u8(5); w.u16(1); w.u16(0); w.u32(Math.max(0, Math.floor(agora / 1000) - EPOCA_FIT))
  w.def(1, 26, [[4, 1, 0x00], [6, 2, 0x84], [8, 16, 0x07]])
  w.u8(1); w.u8(SPORT_FIT[s.modalidade] ?? 0); w.u16(passos.length); w.str(s.titulo, 16)
  w.def(2, 27, [[254, 2, 0x84], [0, 16, 0x07], [1, 1, 0x00], [2, 4, 0x86], [3, 1, 0x00], [4, 4, 0x86], [5, 4, 0x86], [6, 4, 0x86], [7, 1, 0x00]])
  passos.forEach((p, i) => {
    w.u8(2); w.u16(i); w.str(p.nome, 16); w.u8(p.durTipo); w.u32(p.durValor); w.u8(p.alvoTipo); w.u32(p.alvoValor); w.u32(p.baixo); w.u32(p.alto); w.u8(p.intensidade)
  })
  const dados = Uint8Array.from(w.partes)
  const cab = new Uint8Array(14)
  const dv = new DataView(cab.buffer)
  cab[0] = 14; cab[1] = 0x10; dv.setUint16(2, 2132, true); dv.setUint32(4, dados.length, true); cab.set([0x2e, 0x46, 0x49, 0x54], 8)
  dv.setUint16(12, crc16(cab.slice(0, 12)), true)
  const crc = crc16(dados)
  const out = new Uint8Array(14 + dados.length + 2)
  out.set(cab); out.set(dados, 14); out[out.length - 2] = crc & 0xff; out[out.length - 1] = crc >> 8
  return out
}

// ── FIT de treino → passos (importar para a biblioteca) ─────────────────────
const TECNICOS = ['continuous', 'interval', 'active', 'rest', 'repeat', 'open', 'warmup', 'cooldown', 'recovery', 'work']
const TITULO_PADRAO: Record<string, string> = { warmup: 'Aquecimento', cooldown: 'Volta à calma', recovery: 'Recuperação', work: 'Bloco principal' }

export function lerTreinoFit(buf: Uint8Array): { titulo: string | null; modalidade: Modalidade; passos: Partial<Passo>[] } | null {
  const msgs = lerMensagens(buf, [26, 27])
  if (!msgs) return null
  const brutos = msgs.filter((m) => m.global === 27).map((m) => m.campos)
  if (!brutos.length) return null
  const wk = msgs.find((m) => m.global === 26)?.campos
  const num = (m: Mensagem, k: number, d: number) => (typeof m[k] === 'number' ? (m[k] as number) : d)
  // Marcadores de repetição: duration_type 6, valor = nº de vezes, target_value = índice inicial.
  const grupos = new Map<number, { g: number; n: number }>()
  let g = 1
  brutos.forEach((m, i) => {
    if (num(m, 1, 5) !== 6) return
    const grupo = { g: g++, n: num(m, 2, 1) }
    for (let j = num(m, 4, 0); j < i; j++) grupos.set(j, grupo)
  })
  const passos: Partial<Passo>[] = []
  brutos.forEach((m, i) => {
    const dt = num(m, 1, 5)
    if (dt === 6) return
    const dv = num(m, 2, 0), alvoTipo = num(m, 3, 2), alvoValor = num(m, 4, 0), baixo = num(m, 5, U32), alto = num(m, 6, U32)
    const tipo: TipoPasso = ({ 2: 'warmup', 3: 'cooldown', 1: 'recovery' } as Record<number, TipoPasso>)[num(m, 7, 0)] ?? 'work'
    const nome = String(m[0] ?? '').trim()
    let alvo: Partial<Passo> = { intensidade_tipo: 'open', alvo_min: null, alvo_max: null, alvo_unidade: null }
    if (alvoTipo === 1 && alvoValor > 0 && alvoValor <= 5) alvo = { intensidade_tipo: 'zone', alvo_min: alvoValor, alvo_max: alvoValor, alvo_unidade: 'zone' }
    else if (alvoTipo === 1 && baixo !== U32) alvo = { intensidade_tipo: 'heart_rate', alvo_min: baixo > 100 ? baixo - 100 : baixo, alvo_max: alto !== U32 ? (alto > 100 ? alto - 100 : alto) : null, alvo_unidade: 'bpm' }
    else if (alvoTipo === 0 && baixo !== U32 && alto !== U32 && baixo > 0 && alto > 0) alvo = { intensidade_tipo: 'pace', alvo_min: Math.round(1_000_000 / alto), alvo_max: Math.round(1_000_000 / baixo), alvo_unidade: 'pace' }
    else if (alvoTipo === 4 && baixo !== U32) alvo = { intensidade_tipo: 'power', alvo_min: baixo > 1000 ? baixo - 1000 : baixo, alvo_max: alto !== U32 ? (alto > 1000 ? alto - 1000 : alto) : null, alvo_unidade: 'w' }
    const gr = grupos.get(i)
    passos.push({
      tipo, titulo: TECNICOS.includes(nome.toLowerCase()) || !nome ? TITULO_PADRAO[tipo] : nome,
      duracao_s: dt === 0 && dv > 0 ? Math.round(dv / 1000) : null, distancia_m: dt === 1 && dv > 0 ? Math.round(dv / 100) : null,
      aberto: !(dt === 0 || dt === 1) || dv === 0, grupo_repeticao: gr?.g ?? null, repeticoes: gr ? gr.n : null, notas: null, ...alvo,
    })
  })
  // Aquecimento/volta à calma pela posição em relação ao bloco de tiros (FITs que marcam tudo como "active").
  const ini = passos.findIndex((p) => p.repeticoes || (p.tipo === 'work' && passos[passos.indexOf(p) + 1]?.tipo === 'recovery'))
  if (ini > 0) {
    let fim = ini
    passos.forEach((p, i) => { if (p.repeticoes || p.tipo === 'recovery') fim = i })
    passos.forEach((p, i) => { if (p.tipo === 'work' && i < ini) p.tipo = 'warmup'; if (p.tipo === 'work' && i > fim) p.tipo = 'cooldown' })
  }
  // No modelo da ADTRISC só o passo de esforço leva "repeticoes" (o descanso logo depois é a recuperação).
  passos.forEach((p, i) => { if (p.tipo === 'recovery' && passos[i - 1]?.repeticoes) { p.repeticoes = passos[i - 1].repeticoes } })
  return { titulo: typeof wk?.[8] === 'string' ? (wk[8] as string) : null, modalidade: ESPORTE[num(wk ?? {}, 4, 1)] ?? 'running', passos }
}
