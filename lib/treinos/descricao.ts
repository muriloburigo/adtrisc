// Descrição do treino em linguagem simples, com os alvos convertidos para o
// atleta (zona → pace/velocidade dele). Usada no portal e nos cards de detalhe.
import { NOMES_ZONA } from '@/lib/zonas'
import { passosParaBlocos, type Alvo, type Esforco } from './blocos'
import { faixaZona, formatarVelocidade, type Referencia } from './calculos'
import { CORES_ZONA, NIVEIS_PSE, TIPOS_PASSO, type Modalidade, type Passo, type TipoPasso } from './tipos'

export type Contexto = { referencia?: Referencia | null; limites?: number[]; fcMax?: number | null }
export type LinhaTreino = { secao: TipoPasso; rotulo: string; principal: string; alvo: string; cor: string | null; notas: string }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

function quanto(e: Esforco): string {
  if (e.medida === 'distancia' && e.valor) return e.valor >= 1000 && e.valor % 100 === 0 ? `${(e.valor / 1000).toLocaleString('pt-BR')} km` : `${e.valor} m`
  if (e.medida === 'tempo' && e.valor) return e.valor % 60 === 0 ? `${e.valor / 60} min` : mmss(e.valor)
  return 'livre (até a volta)'
}

export function textoAlvo(a: Alvo, modalidade: Modalidade, ctx: Contexto): { texto: string; cor: string | null } {
  if (a.min === null || a.tipo === 'open') return { texto: '', cor: null }
  const max = a.max ?? a.min
  switch (a.unidade) {
    case 'zone': {
      const z1 = Math.round(Math.min(a.min, max)), z2 = Math.round(Math.max(a.min, max))
      const nome = z1 === z2 ? `Z${z1} · ${NOMES_ZONA[z1 - 1] ?? ''}` : `Z${z1}–Z${z2}`
      const ref = ctx.referencia
      let faixa = ''
      if (ref && ['running', 'swimming', 'cycling'].includes(modalidade)) {
        const lento = ref.velocidade_ms * faixaZona(z1, ctx.limites).min / 100
        const rapido = ref.velocidade_ms * faixaZona(z2, ctx.limites).max / 100
        faixa = modalidade === 'cycling'
          ? ` (${formatarVelocidade(lento, modalidade)} a ${formatarVelocidade(rapido, modalidade)})`
          : ` (${formatarVelocidade(rapido, modalidade)} a ${formatarVelocidade(lento, modalidade)})`
      }
      return { texto: nome + faixa, cor: CORES_ZONA[z1 - 1] ?? null }
    }
    case 'pace': {
      const un = modalidade === 'swimming' ? '/100m' : '/km'
      return { texto: a.min === max ? `${mmss(a.min)}${un}` : `${mmss(Math.min(a.min, max))} a ${mmss(Math.max(a.min, max))}${un}`, cor: null }
    }
    case 'kmh': return { texto: a.min === max ? `${a.min} km/h` : `${a.min} a ${max} km/h`, cor: null }
    case 'bpm': return { texto: a.min === max ? `FC ${a.min} bpm` : `FC ${a.min} a ${max} bpm`, cor: null }
    case 'w': return { texto: a.min === max ? `${a.min} W` : `${a.min} a ${max} W`, cor: null }
    case 'rpe': {
      const n = NIVEIS_PSE.find((x) => x.valor === Math.round(a.min!))
      return { texto: `Esforço ${a.min}/5${n ? ` · ${n.nome.toLowerCase()}` : ''}`, cor: n?.cor ?? null }
    }
    default: return { texto: '', cor: null }
  }
}

export function descreverTreino(passos: Passo[], modalidade: Modalidade, ctx: Contexto = {}): LinhaTreino[] {
  return passosParaBlocos(passos).map((b) => {
    if (b.modo === 'nota') return { secao: 'note', rotulo: 'Orientação', principal: b.notas, alvo: '', cor: null, notas: '' }
    const alvo = textoAlvo(b.esforco.alvo, modalidade, ctx)
    let principal = `${b.esforco.titulo ? `${b.esforco.titulo} · ` : ''}${quanto(b.esforco)}`
    if (b.modo === 'intervalado') {
      principal = `${b.repeticoes} × ${quanto(b.esforco)}${b.esforco.titulo ? ` (${b.esforco.titulo})` : ''}`
      if (b.descanso) {
        const d = textoAlvo(b.descanso.alvo, modalidade, ctx)
        principal += ` · descanso ${quanto(b.descanso)}${d.texto ? ` em ${d.texto.split(' (')[0]}` : ''}`
      }
    }
    return { secao: b.secao, rotulo: TIPOS_PASSO[b.secao] ?? '', principal, alvo: alvo.texto, cor: alvo.cor, notas: b.notas }
  })
}

/** Alvo do bloco principal (1º passo de esforço com alvo), para o comparativo. */
export function alvoPrincipal(passos: Passo[], modalidade: Modalidade, ctx: Contexto = {}): string | null {
  const p = [...passos].sort((a, b) => a.ordem - b.ordem).find((x) => (x.tipo === 'work' || x.tipo === 'drill') && x.alvo_min != null)
  if (!p) return null
  return textoAlvo({ tipo: p.intensidade_tipo ?? 'open', min: p.alvo_min, max: p.alvo_max, unidade: p.alvo_unidade }, modalidade, ctx).texto || null
}
