// Gerador automático de plano — porte de TrainingPlanGeneratorService +
// TrainingSessionBlueprintService do Movelly (regra 'v1-progressive-simple').
// O gerador decide QUANDO e QUE tipo de treino; o "blueprint" decide COMO cada
// treino é composto. Diferenças em relação ao Movelly (de propósito):
// - alvos em zonas da ADTRISC (Z1–Z5) e PSE 1–5 (o Movelly usa RPE 1–10);
// - intervalado: o Movelly punha o tempo TODO do bloco principal em cada uma das
//   4 repetições (4× a duração); aqui o bloco é dividido entre as repetições;
// - distância estimada por modalidade (o Movelly só tinha corrida: duração/6,5).
// Dias da semana no padrão ISO: 1 = segunda … 7 = domingo.

import { calcularCarga, metricasPlanejadas, normalizarPassos, referenciaPadrao, somarSessoes } from './calculos'
import { inicioSemana, somarDias } from './datas'
import type { Dificuldade, Modalidade, Objetivo, Passo, TipoPasso, TipoSessao } from './tipos'

export type EntradaGerador = {
  inicio: string
  fim: string
  modalidade: Modalidade
  objetivo: Objetivo
  dificuldade: Dificuldade
  sessoes_semana: number
  dias_disponiveis: number[]          // ISO 1..7; vazio = padrão pela frequência
  dia_longo?: number                  // ISO, padrão sábado (6)
  incluir_forca?: boolean
  distancia_alvo_km?: number | null
  prova_alvo_data?: string | null
  duracao_base_min?: number | null
}

export type SessaoGerada = {
  data: string
  ordem: number
  titulo: string
  tipo: TipoSessao
  modalidade: Modalidade
  duracao_min: number
  distancia_km: number | null
  intensidade_tipo: string
  intensidade_alvo: string
  chave: boolean
  notas: string | null
  carga: number
  passos: Passo[]
}

export type ResultadoGerador = {
  sessoes: SessaoGerada[]
  resumo: { semanas: number; sessoes: number; duracao_min: number; distancia_km: number; carga: number; regra: string }
  avisos: string[]
}

export const OBJETIVOS_INFO: Record<Objetivo, { descricao: string; sessoes_semana: number | null }> = {
  manual: { descricao: 'Plano criado pelo treinador, treino por treino.', sessoes_semana: null },
  base: { descricao: 'Construção aeróbica com progressão conservadora.', sessoes_semana: 3 },
  endurance: { descricao: 'Maior volume semanal e treinos longos progressivos.', sessoes_semana: 4 },
  speed: { descricao: 'Sessões intervaladas e controle de recuperação.', sessoes_semana: 4 },
  race_specific: { descricao: 'Preparação orientada a uma prova alvo, com polimento simples.', sessoes_semana: 4 },
  recovery: { descricao: 'Volume reduzido para retomada ou semana regenerativa.', sessoes_semana: 2 },
}

export const DIAS_ISO = [
  { v: 1, nome: 'Seg' }, { v: 2, nome: 'Ter' }, { v: 3, nome: 'Qua' }, { v: 4, nome: 'Qui' },
  { v: 5, nome: 'Sex' }, { v: 6, nome: 'Sáb' }, { v: 7, nome: 'Dom' },
]

const diaIso = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return d === 0 ? 7 : d }
const diasEntre = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000)

// ── Blueprint ───────────────────────────────────────────────────────────────
export function duracaoBase(d: Dificuldade): number {
  return { beginner: 38, intermediate: 50, advanced: 64, performance: 76 }[d] ?? 50
}

function duracaoDoTipo(tipo: TipoSessao, base: number, progressao: number, d: Dificuldade): number {
  const mt: Partial<Record<TipoSessao, number>> = { recovery: 0.52, technique: 0.62, strength: 0.65, interval: 0.82, race_simulation: 1.05, long: 1.35 }
  const md = { beginner: 0.85, intermediate: 1, advanced: 1.12, performance: 1.25 }[d] ?? 1
  return Math.max(20, Math.round((base * (mt[tipo] ?? 0.88) * progressao * md) / 5) * 5)
}

// min por km a um ritmo de rodagem (só para estimar a distância sem alvo).
const MIN_POR_KM: Partial<Record<Modalidade, number>> = { running: 6.5, cycling: 2, swimming: 25 }

function distanciaDoTipo(tipo: TipoSessao, duracao: number, modalidade: Modalidade, alvo: number | null | undefined, semana: number, total: number): number | null {
  if (tipo === 'strength' || !MIN_POR_KM[modalidade]) return null
  if (alvo) {
    const progresso = total > 1 ? (semana + 1) / total : 1
    const longo = Math.max(modalidade === 'swimming' ? 0.4 : 2, alvo * (0.35 + progresso * 0.35))
    const f: Partial<Record<TipoSessao, number>> = { long: 1, recovery: 0.35, interval: 0.45, race_simulation: 0.65 }
    return Math.round(longo * (f[tipo] ?? 0.5) * 100) / 100
  }
  return Math.round((duracao / MIN_POR_KM[modalidade]!) * 100) / 100
}

type Alvo = { tipo: 'zone' | 'rpe'; min: number; max: number }
const zona = (min: number, max = min): Alvo => ({ tipo: 'zone', min, max })
const pse = (n: number): Alvo => ({ tipo: 'rpe', min: n, max: n })
const rotuloAlvo = (a: Alvo) => (a.tipo === 'rpe' ? `PSE ${a.min}` : a.min === a.max ? `Z${a.min}` : `Z${a.min}-Z${a.max}`)

function intensidadeDoTipo(tipo: TipoSessao, objetivo: Objetivo): Alvo {
  switch (tipo) {
    case 'interval': return objetivo === 'speed' ? zona(4, 5) : zona(3, 4)
    case 'recovery': return zona(1, 2)
    case 'long': return zona(2)
    case 'race_simulation': return pse(4)   // RPE 7/10
    case 'strength': return pse(3)          // RPE 6/10
    default: return zona(2, 3)
  }
}

const TITULOS: Partial<Record<TipoSessao, string>> = {
  long: 'Treino longo progressivo', recovery: 'Treino regenerativo', strength: 'Força e prevenção', race_simulation: 'Simulação específica',
}
const NOTAS: Partial<Record<TipoSessao, string>> = {
  long: 'Priorize constância, hidratação e controle de esforço.',
  interval: 'Mantenha as recuperações leves para preservar a qualidade das repetições.',
  recovery: 'Treino leve, sem buscar ritmo.',
  strength: 'Ajuste as cargas mantendo a técnica perfeita.',
  race_simulation: 'Use este treino para testar ritmo, estratégia e alimentação.',
}

function passo(tipo: TipoPasso, titulo: string, duracao_s: number | null, distancia_m: number | null, alvo: Alvo | null, rep?: { grupo: number; n: number }): Partial<Passo> {
  return {
    tipo, titulo, duracao_s, distancia_m,
    intensidade_tipo: alvo ? alvo.tipo : 'open',
    alvo_min: alvo?.min ?? null, alvo_max: alvo?.max ?? null, alvo_unidade: alvo ? alvo.tipo : null,
    grupo_repeticao: rep?.grupo ?? null, repeticoes: rep?.n ?? null, aberto: false, notas: null,
  }
}

function passosDoTipo(tipo: TipoSessao, duracao: number, distancia: number | null, alvo: Alvo, porDistancia: boolean): Partial<Passo>[] {
  if (tipo === 'strength') {
    return [
      passo('warmup', 'Mobilidade e ativação', 600, null, null),
      passo('strength', 'Força principal', Math.max(900, (duracao - 15) * 60), null, alvo),
      passo('cooldown', 'Alongamento leve', 300, null, null),
    ]
  }
  if (tipo === 'interval') {
    const reps = 4, rec = 120
    const principal = Math.max(900, (duracao - 22) * 60)
    const tiro = Math.max(60, Math.round((principal - reps * rec) / reps / 30) * 30)
    return [
      passo('warmup', 'Aquecimento progressivo', 720, null, zona(1, 2)),
      passo('work', 'Repetição', tiro, null, alvo, { grupo: 1, n: reps }),
      passo('recovery', 'Recuperação leve', rec, null, zona(1), { grupo: 1, n: reps }),
      passo('cooldown', 'Volta à calma', 600, null, zona(1)),
    ]
  }
  const aq = Math.min(900, Math.max(300, Math.round(duracao * 60 * 0.18)))
  const vc = Math.min(600, Math.max(300, Math.round(duracao * 60 * 0.12)))
  const principal = Math.max(300, duracao * 60 - aq - vc)
  // Com distância alvo, o bloco principal é por distância (como no Movelly); senão, por tempo.
  return [
    passo('warmup', 'Aquecimento', aq, null, zona(1, 2)),
    porDistancia && distancia ? passo('work', 'Bloco principal', null, Math.round(distancia * 1000), alvo) : passo('work', 'Bloco principal', principal, null, alvo),
    passo('cooldown', 'Volta à calma', vc, null, zona(1)),
  ]
}

// ── Calendário do plano ─────────────────────────────────────────────────────
function diasPadrao(sessoes: number): number[] {
  if (sessoes <= 2) return [2, 6]
  if (sessoes === 3) return [2, 4, 6]
  if (sessoes === 4) return [2, 4, 6, 7]
  return [1, 2, 4, 6, 7]
}

function progressaoDaSemana(semana: number, total: number, inicioSem: string, prova?: string | null): number {
  let p = 1 + Math.min(0.35, semana * 0.045)
  if ((semana + 1) % 4 === 0) p *= 0.82                    // semana regenerativa a cada 4
  if (prova) {
    const ate = diasEntre(inicioSem, prova)
    if (ate >= 0 && ate <= 7) p *= 0.6
    else if (ate > 7 && ate <= 14) p *= 0.78
  } else if (total > 1 && semana === total - 1) p *= 0.9
  return Math.max(0.45, p)
}

function tiposDaSemana(objetivo: Objetivo, datas: string[], forca: boolean, diaLongo: number): TipoSessao[] {
  const n = datas.length
  const tipos: TipoSessao[] = Array(n).fill('base')
  if (!n) return tipos
  const primeiroLivre = (exceto: number[]) => { for (let i = 0; i < n; i++) if (!exceto.includes(i)) return i; return 0 }
  const ultimoLivre = (exceto: number[]) => { for (let i = n - 1; i >= 0; i--) if (!exceto.includes(i)) return i; return Math.max(0, n - 1) }
  const ocupados = () => tipos.map((t, i) => (t !== 'base' ? i : -1)).filter((i) => i >= 0)

  let iLongo = 0, melhor = 99
  datas.forEach((d, i) => { const s = Math.abs(diaIso(d) - diaLongo); if (s < melhor) { melhor = s; iLongo = i } })
  tipos[iLongo] = objetivo === 'recovery' ? 'recovery' : 'long'
  if (n >= 2 && (objetivo === 'speed' || objetivo === 'race_specific')) tipos[primeiroLivre([iLongo])] = 'interval'
  if (n >= 3 && objetivo === 'race_specific') tipos[primeiroLivre([iLongo, tipos.indexOf('interval')])] = 'race_simulation'
  if (n >= 4) tipos[primeiroLivre(ocupados())] = 'recovery'
  if (forca && n >= 3) {
    const i = ultimoLivre(ocupados())
    if (tipos[i] === 'base') tipos[i] = 'strength'
  }
  return tipos
}

export function gerarPlano(e: EntradaGerador): ResultadoGerador {
  const avisos: string[] = []
  const vazio = (msg: string): ResultadoGerador => ({ sessoes: [], resumo: { semanas: 0, sessoes: 0, duracao_min: 0, distancia_km: 0, carga: 0, regra: 'v1-progressive-simple' }, avisos: [msg] })
  if (e.inicio > e.fim) return vazio('A data inicial precisa ser anterior à data final.')
  if (diasEntre(e.inicio, e.fim) > 366) return vazio('O plano pode ter no máximo um ano.')

  const porSemana = Math.max(1, Math.min(7, Math.round(e.sessoes_semana || 3)))
  const dias = (e.dias_disponiveis.length ? [...new Set(e.dias_disponiveis)].filter((d) => d >= 1 && d <= 7) : diasPadrao(porSemana)).sort((a, b) => a - b)
  const base = e.duracao_base_min || duracaoBase(e.dificuldade)
  const semanas: string[] = []
  for (let s = inicioSemana(e.inicio); s <= inicioSemana(e.fim); s = somarDias(s, 7)) semanas.push(s)

  const sessoes: SessaoGerada[] = []
  semanas.forEach((seg, iSem) => {
    const disponiveis = dias.map((d) => somarDias(seg, d - 1)).filter((d) => d >= e.inicio && d <= e.fim)
    if (disponiveis.length < porSemana) avisos.push('Algumas semanas têm menos dias disponíveis do que a frequência semanal pedida.')
    const datas = disponiveis.slice(0, porSemana)
    const tipos = tiposDaSemana(e.objetivo, datas, Boolean(e.incluir_forca), e.dia_longo ?? 6)
    const prog = progressaoDaSemana(iSem, semanas.length, seg, e.prova_alvo_data)
    datas.forEach((data, i) => {
      const tipo = tipos[i] ?? 'base'
      const modalidade: Modalidade = tipo === 'strength' ? 'strength' : e.modalidade
      const duracao = duracaoDoTipo(tipo, base, prog, e.dificuldade)
      const distancia = distanciaDoTipo(tipo, duracao, e.modalidade, e.distancia_alvo_km, iSem, semanas.length)
      const alvo = intensidadeDoTipo(tipo, e.objetivo)
      const passos = normalizarPassos(passosDoTipo(tipo, duracao, distancia, alvo, Boolean(e.distancia_alvo_km)))
      // Duração/distância finais pelos próprios passos (como ao salvar no montador).
      const m = metricasPlanejadas(passos, referenciaPadrao(modalidade))
      const duracao_min = m.duracao_s ? Math.ceil(m.duracao_s / 60) : duracao
      const distancia_km = modalidade === 'strength' ? null : (m.distancia_km ?? distancia)
      sessoes.push({
        data, ordem: 1, tipo, modalidade, duracao_min, distancia_km,
        titulo: tipo === 'interval' ? (e.objetivo === 'speed' ? 'Intervalado de velocidade' : 'Intervalado controlado') : TITULOS[tipo] ?? 'Treino base aeróbico',
        intensidade_tipo: alvo.tipo, intensidade_alvo: rotuloAlvo(alvo),
        chave: ['long', 'interval', 'race_simulation'].includes(tipo),
        notas: NOTAS[tipo] ?? null,
        carga: calcularCarga({ duracao_min, distancia_km, tipo, intensidade_tipo: alvo.tipo, intensidade_alvo: rotuloAlvo(alvo) }),
        passos,
      })
    })
  })
  if (!sessoes.length) avisos.push('Nenhum treino foi gerado para o período informado.')
  const t = somarSessoes(sessoes)
  return {
    sessoes,
    resumo: { semanas: semanas.length, sessoes: sessoes.length, duracao_min: t.duracao_min, distancia_km: t.distancia_km, carga: t.carga, regra: 'v1-progressive-simple' },
    avisos: [...new Set(avisos)],
  }
}
