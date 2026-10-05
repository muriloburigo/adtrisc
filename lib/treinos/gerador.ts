// Gerador automático de plano — porte de TrainingPlanGeneratorService +
// TrainingSessionBlueprintService do Movelly (regra 'v1-progressive-simple').
// O gerador decide QUANDO e QUE tipo de treino; o "blueprint" decide COMO cada
// treino é composto. Diferenças em relação ao Movelly (de propósito):
// - alvos em zonas da ADTRISC (Z1–Z5) e PSE 1–5 (o Movelly usa RPE 1–10);
// - intervalado: o Movelly punha o tempo TODO do bloco principal em cada uma das
//   4 repetições (4× a duração); aqui o bloco é dividido entre as repetições;
// - distância estimada por modalidade (o Movelly só tinha corrida: duração/6,5).
// Dias da semana no padrão ISO: 1 = segunda … 7 = domingo.
// Multiesporte (só ADTRISC, o Movelly não tem): várias modalidades no mesmo plano,
// com frequência e dia de longo por modalidade, limite de treinos por dia e
// treino de transição (bike + corrida no mesmo dia).

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
  multi?: EntradaMulti | null         // presente = plano multiesporte (ignora modalidade/sessoes_semana/dia_longo/distancia_alvo_km)
}

export type ModalidadeMulti = 'swimming' | 'cycling' | 'running'
export type EntradaMulti = {
  modalidades: { modalidade: ModalidadeMulti; sessoes: number; dia_longo: number; distancia_alvo_km?: number | null }[]
  max_por_dia: number                 // treinos por dia (1–3)
  transicao: boolean                  // treino de transição bike + corrida 1×/semana
}

/** Padrão do multiesporte: natação 2, bike 2 (longo sáb), corrida 3 (longo dom), até 2 treinos/dia. */
export const MULTI_PADRAO: EntradaMulti = {
  modalidades: [
    { modalidade: 'swimming', sessoes: 2, dia_longo: 5, distancia_alvo_km: null },
    { modalidade: 'cycling', sessoes: 2, dia_longo: 6, distancia_alvo_km: null },
    { modalidade: 'running', sessoes: 3, dia_longo: 7, distancia_alvo_km: null },
  ],
  max_por_dia: 2,
  transicao: false,
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
  brick: 'Treino de transição: saia da bike direto para a corrida, como na prova.',
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

const NOME_MOD: Record<string, string> = { swimming: 'Natação', cycling: 'Bike', running: 'Corrida', strength: 'Força' }
// Duração relativa por modalidade no multiesporte (a bike costuma ser o treino mais longo).
const FATOR_MOD: Record<string, number> = { swimming: 0.8, cycling: 1.25, running: 0.9, strength: 1 }

/** Nos 2 dias antes da prova o treino vira ativação leve (nada de longo/intervalado na véspera). */
function vesperaDaProva(data: string, e: EntradaGerador) {
  if (!e.prova_alvo_data) return false
  const ate = diasEntre(data, e.prova_alvo_data)
  return ate >= 1 && ate <= 2
}

function montarSessao(p: {
  data: string; tipo: TipoSessao; modalidade: Modalidade; base: number; prog: number; e: EntradaGerador
  alvoKm?: number | null; iSem: number; total: number; prefixo?: string; titulo?: string; ordem?: number
}): SessaoGerada {
  const { data, modalidade, e } = p
  const vespera = vesperaDaProva(data, e) && p.tipo !== 'strength'
  const tipo: TipoSessao = vespera ? 'recovery' : p.tipo
  const duracao = duracaoDoTipo(tipo, p.base, p.prog, e.dificuldade)
  const distancia = distanciaDoTipo(tipo, duracao, modalidade, p.alvoKm, p.iSem, p.total)
  const alvo = tipo === 'brick' ? zona(3) : intensidadeDoTipo(tipo, e.objetivo)
  const passos = normalizarPassos(passosDoTipo(tipo, duracao, distancia, alvo, Boolean(p.alvoKm)))
  // Duração/distância finais pelos próprios passos (como ao salvar no montador).
  const m = metricasPlanejadas(passos, referenciaPadrao(modalidade))
  const duracao_min = m.duracao_s ? Math.ceil(m.duracao_s / 60) : duracao
  const distancia_km = modalidade === 'strength' ? null : (m.distancia_km ?? distancia)
  const titulo = vespera ? 'Ativação pré-prova' : p.titulo ?? (tipo === 'interval' ? (e.objetivo === 'speed' ? 'Intervalado de velocidade' : 'Intervalado controlado') : TITULOS[tipo] ?? 'Treino base aeróbico')
  return {
    data, ordem: p.ordem ?? 1, tipo, modalidade, duracao_min, distancia_km,
    titulo: p.prefixo ? `${p.prefixo}: ${titulo}` : titulo,
    intensidade_tipo: alvo.tipo, intensidade_alvo: rotuloAlvo(alvo),
    chave: ['long', 'interval', 'race_simulation', 'brick'].includes(tipo),
    notas: vespera ? 'Leve, só para soltar o corpo antes da prova.' : NOTAS[tipo] ?? null,
    carga: calcularCarga({ duracao_min, distancia_km, tipo, intensidade_tipo: alvo.tipo, intensidade_alvo: rotuloAlvo(alvo) }),
    passos,
  }
}

/**
 * Distribui os treinos de cada modalidade nos dias da semana: primeiro o longo
 * de cada uma no dia pedido (ou o mais próximo com vaga), depois em rodízio,
 * preferindo dias mais vazios e sem colar dois treinos da mesma modalidade.
 * Nunca repete modalidade no mesmo dia nem passa do limite por dia.
 */
function alocarSemana(datas: string[], mods: EntradaMulti['modalidades'], maxDia: number) {
  const carga = new Map<string, number>(datas.map((d) => [d, 0]))
  const escolhidos = new Map<string, string[]>(mods.map((m) => [m.modalidade, []]))
  const cabe = (mod: string, d: string) => (carga.get(d) ?? 0) < maxDia && !escolhidos.get(mod)!.includes(d)
  const por = (mod: string, d: string) => { escolhidos.get(mod)!.push(d); carga.set(d, (carga.get(d) ?? 0) + 1) }
  // 1) longos
  for (const m of mods) {
    if (m.sessoes < 1) continue
    const c = datas.filter((d) => cabe(m.modalidade, d)).sort((a, b) => Math.abs(diaIso(a) - m.dia_longo) - Math.abs(diaIso(b) - m.dia_longo))[0]
    if (c) por(m.modalidade, c)
  }
  // 2) demais, em rodízio
  let mudou = true
  while (mudou) {
    mudou = false
    for (const m of mods) {
      const ja = escolhidos.get(m.modalidade)!
      if (ja.length >= m.sessoes) continue
      const melhor = datas.filter((d) => cabe(m.modalidade, d)).map((d) => {
        const vizinho = ja.some((x) => Math.abs(diasEntre(x, d)) === 1)
        return { d, nota: (carga.get(d) ?? 0) * 10 + (vizinho ? 3 : 0) }
      }).sort((a, b) => a.nota - b.nota || a.d.localeCompare(b.d))[0]
      if (melhor) { por(m.modalidade, melhor.d); mudou = true }
    }
  }
  for (const v of escolhidos.values()) v.sort()
  return { escolhidos, carga }
}

const ORDEM_DIA: Record<string, number> = { swimming: 1, strength: 2, cycling: 3, running: 4 }

function gerarMulti(e: EntradaGerador, multi: EntradaMulti, semanas: string[], avisos: string[]): SessaoGerada[] {
  const mods = multi.modalidades.filter((m) => m.sessoes > 0).map((m) => ({ ...m, sessoes: Math.min(7, Math.round(m.sessoes)) }))
  const maxDia = Math.max(1, Math.min(3, Math.round(multi.max_por_dia || 2)))
  const dias = (e.dias_disponiveis.length ? [...new Set(e.dias_disponiveis)].filter((d) => d >= 1 && d <= 7) : [1, 2, 3, 4, 5, 6, 7]).sort((a, b) => a - b)
  const base = e.duracao_base_min || duracaoBase(e.dificuldade)
  const comTransicao = multi.transicao && e.objetivo !== 'recovery' && mods.some((m) => m.modalidade === 'cycling') && mods.some((m) => m.modalidade === 'running')
  const out: SessaoGerada[] = []

  semanas.forEach((seg, iSem) => {
    // O dia da prova fica livre: o treino do dia é a prova.
    const datas = dias.map((d) => somarDias(seg, d - 1)).filter((d) => d >= e.inicio && d <= e.fim && d !== e.prova_alvo_data)
    const { escolhidos, carga } = alocarSemana(datas, mods, maxDia)
    for (const m of mods) {
      if ((escolhidos.get(m.modalidade)?.length ?? 0) < m.sessoes) avisos.push(`Algumas semanas não comportam todos os treinos de ${NOME_MOD[m.modalidade].toLowerCase()} (dias disponíveis × limite por dia).`)
    }
    const prog = progressaoDaSemana(iSem, semanas.length, seg, e.prova_alvo_data)
    const semanaDaProva = e.prova_alvo_data ? (() => { const ate = diasEntre(seg, e.prova_alvo_data!); return ate >= 0 && ate <= 7 })() : false
    const daSemana: SessaoGerada[] = []

    for (const m of mods) {
      const datasM = escolhidos.get(m.modalidade) ?? []
      const tipos = tiposDaSemana(e.objetivo, datasM, false, m.dia_longo)
      const baseM = base * FATOR_MOD[m.modalidade]
      datasM.forEach((data, i) => daSemana.push(montarSessao({
        data, tipo: tipos[i] ?? 'base', modalidade: m.modalidade, base: baseM, prog, e, alvoKm: m.distancia_alvo_km, iSem, total: semanas.length, prefixo: NOME_MOD[m.modalidade],
      })))
    }

    // Transição: uma bike que não é o longo vira "bike + corrida logo depois" (fora da semana da prova).
    if (comTransicao && !semanaDaProva) {
      const bike = daSemana.find((s) => s.modalidade === 'cycling' && s.tipo !== 'long')
      if (bike) {
        const i = daSemana.indexOf(bike)
        daSemana[i] = montarSessao({ data: bike.data, tipo: 'brick', modalidade: 'cycling', base: base * FATOR_MOD.cycling * 0.85, prog, e, iSem, total: semanas.length, titulo: 'Transição — bike' })
        daSemana.push(montarSessao({ data: bike.data, tipo: 'brick', modalidade: 'running', base: 20 / 0.88, prog: Math.min(prog, 1.2), e, iSem, total: semanas.length, titulo: 'Transição — corrida logo após a bike' }))
      } else avisos.push('Sem bike fora do longo em alguma semana: o treino de transição ficou de fora.')
    }

    if (e.incluir_forca) {
      const d = [...datas].sort((a, b) => (carga.get(a) ?? 0) - (carga.get(b) ?? 0) || a.localeCompare(b))[0]
      if (d && (carga.get(d) ?? 0) < maxDia) daSemana.push(montarSessao({ data: d, tipo: 'strength', modalidade: 'strength', base, prog, e, iSem, total: semanas.length }))
      else avisos.push('Sem vaga para o treino de força em alguma semana.')
    }

    // No máximo 2 sessões-chave por semana (com três modalidades, estrela em tudo perde o sentido).
    const prioridade = (x: SessaoGerada) =>
      x.tipo === 'brick' && x.modalidade === 'cycling' ? 0 : x.tipo === 'race_simulation' ? 1
        : x.tipo === 'long' && x.modalidade === 'cycling' ? 2 : x.tipo === 'long' && x.modalidade === 'running' ? 3 : x.tipo === 'interval' ? 4 : 9
    const chaves = new Set(daSemana.filter((x) => x.chave).sort((a, b) => prioridade(a) - prioridade(b)).slice(0, 2))
    for (const x of daSemana) x.chave = chaves.has(x) || (x.tipo === 'brick' && x.modalidade === 'running' && [...chaves].some((c) => c.tipo === 'brick'))

    // Ordem no dia: natação, força, bike, corrida (a corrida da transição logo depois da bike).
    const porDia = new Map<string, SessaoGerada[]>()
    for (const s of daSemana) porDia.set(s.data, [...(porDia.get(s.data) ?? []), s])
    for (const lista of porDia.values()) {
      lista.sort((a, b) => ORDEM_DIA[a.modalidade] - ORDEM_DIA[b.modalidade]).forEach((s, i) => { s.ordem = i + 1 })
    }
    out.push(...daSemana.sort((a, b) => a.data.localeCompare(b.data) || a.ordem - b.ordem))
  })
  return out
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

  if (e.prova_alvo_data && e.fim > e.prova_alvo_data) avisos.push('O plano continua depois da prova: confira se os treinos dessa fase fazem sentido (recuperação).')
  if (e.multi) {
    if (!e.multi.modalidades.some((m) => m.sessoes > 0)) return vazio('Escolha ao menos uma modalidade com treinos na semana.')
    const sessoes = gerarMulti(e, e.multi, semanas, avisos)
    if (!sessoes.length) avisos.push('Nenhum treino foi gerado para o período informado.')
    const t = somarSessoes(sessoes)
    return {
      sessoes,
      resumo: { semanas: semanas.length, sessoes: sessoes.length, duracao_min: t.duracao_min, distancia_km: t.distancia_km, carga: t.carga, regra: 'v1-progressive-simple+multi' },
      avisos: [...new Set(avisos)],
    }
  }

  const sessoes: SessaoGerada[] = []
  semanas.forEach((seg, iSem) => {
    // O dia da prova fica livre: o treino do dia é a prova.
    const disponiveis = dias.map((d) => somarDias(seg, d - 1)).filter((d) => d >= e.inicio && d <= e.fim && d !== e.prova_alvo_data)
    if (disponiveis.length < porSemana) avisos.push('Algumas semanas têm menos dias disponíveis do que a frequência semanal pedida.')
    const datas = disponiveis.slice(0, porSemana)
    const tipos = tiposDaSemana(e.objetivo, datas, Boolean(e.incluir_forca), e.dia_longo ?? 6)
    const prog = progressaoDaSemana(iSem, semanas.length, seg, e.prova_alvo_data)
    datas.forEach((data, i) => {
      const tipo = tipos[i] ?? 'base'
      sessoes.push(montarSessao({ data, tipo, modalidade: tipo === 'strength' ? 'strength' : e.modalidade, base, prog, e, alvoKm: e.distancia_alvo_km, iSem, total: semanas.length }))
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
