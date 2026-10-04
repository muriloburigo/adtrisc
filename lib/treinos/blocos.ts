// Montador: o treinador edita BLOCOS (como as "seções" do montador do Movelly)
// e o banco guarda PASSOS (training_steps). Conversão nos dois sentidos:
//   contínuo     → 1 passo
//   intervalado  → passo de esforço com repeticoes = N + passo 'recovery' (descanso)
//   orientação   → passo 'note' (só texto)
import type { Intensidade, Passo, TipoPasso } from './tipos'

export type Medida = 'distancia' | 'tempo' | 'aberto'
export type Alvo = { tipo: Intensidade; min: number | null; max: number | null; unidade: string | null }
export type Esforco = { titulo: string; medida: Medida; valor: number | null; alvo: Alvo } // valor: m ou s

export type Bloco = {
  chave: string
  secao: TipoPasso           // aquecimento, principal, técnica…
  modo: 'continuo' | 'intervalado' | 'nota'
  esforco: Esforco
  repeticoes: number
  descanso: Esforco | null
  notas: string
}

const ALVO_LIVRE: Alvo = { tipo: 'open', min: null, max: null, unidade: null }
let seq = 0
export const novaChave = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`

export function blocoNovo(secao: TipoPasso = 'work', modo: Bloco['modo'] = 'continuo'): Bloco {
  const padrao: Record<string, Partial<Esforco>> = {
    warmup: { titulo: 'Aquecimento', medida: 'tempo', valor: 600, alvo: { tipo: 'zone', min: 1, max: 1, unidade: 'zone' } },
    cooldown: { titulo: 'Volta à calma', medida: 'tempo', valor: 300, alvo: { tipo: 'zone', min: 1, max: 1, unidade: 'zone' } },
    work: { titulo: modo === 'intervalado' ? 'Tiro' : 'Contínuo', medida: 'distancia', valor: modo === 'intervalado' ? 400 : 2000, alvo: { tipo: 'zone', min: modo === 'intervalado' ? 4 : 2, max: modo === 'intervalado' ? 4 : 2, unidade: 'zone' } },
  }
  const base = padrao[secao] ?? { titulo: '', medida: 'tempo', valor: 300, alvo: ALVO_LIVRE }
  return {
    chave: novaChave(),
    secao,
    modo,
    esforco: { titulo: base.titulo ?? '', medida: base.medida ?? 'tempo', valor: base.valor ?? null, alvo: base.alvo ?? ALVO_LIVRE },
    repeticoes: modo === 'intervalado' ? 6 : 1,
    descanso: modo === 'intervalado'
      ? { titulo: 'Recuperação', medida: 'tempo', valor: 90, alvo: { tipo: 'zone', min: 1, max: 1, unidade: 'zone' } }
      : null,
    notas: '',
  }
}

function esforcoDoPasso(p: Passo): Esforco {
  return {
    titulo: p.titulo,
    medida: p.distancia_m ? 'distancia' : p.duracao_s ? 'tempo' : 'aberto',
    valor: p.distancia_m ?? p.duracao_s ?? null,
    alvo: { tipo: p.intensidade_tipo ?? 'open', min: p.alvo_min, max: p.alvo_max, unidade: p.alvo_unidade },
  }
}

export function passosParaBlocos(passos: Passo[]): Bloco[] {
  const ord = [...passos].sort((a, b) => a.ordem - b.ordem)
  const blocos: Bloco[] = []
  for (let i = 0; i < ord.length; i++) {
    const p = ord[i]
    if (p.tipo === 'note') {
      blocos.push({ ...blocoNovo('note', 'nota'), esforco: { ...esforcoDoPasso(p), medida: 'aberto' }, notas: p.notas ?? p.titulo ?? '' })
      continue
    }
    const reps = p.repeticoes ?? 1
    const prox = ord[i + 1]
    if (reps > 1) {
      const descanso = prox?.tipo === 'recovery' ? prox : null
      blocos.push({
        chave: novaChave(), secao: p.tipo, modo: 'intervalado', esforco: esforcoDoPasso(p), repeticoes: reps,
        descanso: descanso ? esforcoDoPasso(descanso) : null, notas: p.notas ?? '',
      })
      if (descanso) i++
    } else {
      blocos.push({ chave: novaChave(), secao: p.tipo, modo: 'continuo', esforco: esforcoDoPasso(p), repeticoes: 1, descanso: null, notas: p.notas ?? '' })
    }
  }
  return blocos
}

function passoDoEsforco(e: Esforco, tipo: TipoPasso, extra: Partial<Passo> = {}): Omit<Passo, 'ordem'> {
  return {
    tipo,
    titulo: e.titulo.trim(),
    duracao_s: e.medida === 'tempo' ? e.valor : null,
    distancia_m: e.medida === 'distancia' ? e.valor : null,
    intensidade_tipo: e.alvo.tipo === 'open' ? null : e.alvo.tipo,
    alvo_min: e.alvo.tipo === 'open' ? null : e.alvo.min,
    alvo_max: e.alvo.tipo === 'open' ? null : (e.alvo.max ?? e.alvo.min),
    alvo_unidade: e.alvo.tipo === 'open' ? null : e.alvo.unidade,
    grupo_repeticao: null,
    repeticoes: null,
    aberto: e.medida === 'aberto',
    notas: null,
    ...extra,
  }
}

export function blocosParaPassos(blocos: Bloco[]): Passo[] {
  const passos: Omit<Passo, 'ordem'>[] = []
  let grupo = 0
  for (const b of blocos) {
    if (b.modo === 'nota') {
      passos.push({ ...passoDoEsforco({ ...b.esforco, medida: 'aberto', alvo: ALVO_LIVRE }, 'note'), aberto: false, titulo: b.esforco.titulo || 'Orientação', notas: b.notas.trim() || null })
      continue
    }
    if (b.modo === 'intervalado' && b.repeticoes > 1) {
      grupo++
      passos.push(passoDoEsforco(b.esforco, b.secao === 'recovery' ? 'work' : b.secao, { repeticoes: b.repeticoes, grupo_repeticao: grupo, notas: b.notas.trim() || null }))
      if (b.descanso) passos.push(passoDoEsforco(b.descanso, 'recovery', { grupo_repeticao: grupo }))
      continue
    }
    passos.push(passoDoEsforco(b.esforco, b.secao, { notas: b.notas.trim() || null }))
  }
  return passos.map((p, i) => ({ ...p, ordem: i + 1 }))
}

// ── Entrada de valores no montador ─────────────────────────────────────────
/** "4:30" → 270 · "90" → 90 (segundos) · inválido → null */
export function lerMmss(txt: string): number | null {
  const t = txt.trim()
  if (!t) return null
  const m = t.match(/^(\d{1,3}):([0-5]?\d)$/)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

export const mostrarMmss = (s: number | null | undefined) =>
  s === null || s === undefined ? '' : `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`
