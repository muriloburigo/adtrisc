// Tipos e rótulos do módulo de treinos. Os códigos são os mesmos do Movelly
// Core (app/Domain/Training/Enums) para facilitar o porte da lógica, do FIT e
// do Intervals.icu; os rótulos são os textos de tela.

export const MODALIDADES = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  swimming: 'Natação',
  strength: 'Força',
  other: 'Outro',
} as const
export type Modalidade = keyof typeof MODALIDADES

export const TIPOS_SESSAO = {
  base: 'Base',
  long: 'Longo',
  interval: 'Intervalado',
  recovery: 'Recuperativo',
  technique: 'Técnica',
  strength: 'Força',
  race_simulation: 'Simulado de prova',
  brick: 'Transição (brick)',
} as const
export type TipoSessao = keyof typeof TIPOS_SESSAO

export const TIPOS_PASSO = {
  warmup: 'Aquecimento',
  work: 'Bloco principal',
  recovery: 'Recuperação',
  cooldown: 'Volta à calma',
  drill: 'Técnica',
  strength: 'Força',
  note: 'Orientação',
} as const
export type TipoPasso = keyof typeof TIPOS_PASSO

export const INTENSIDADES = {
  open: 'Livre',
  rpe: 'Percepção de esforço',
  zone: 'Zona',
  pace: 'Pace',
  heart_rate: 'Frequência cardíaca',
  power: 'Potência',
} as const
export type Intensidade = keyof typeof INTENSIDADES

// Percepção de esforço (PSE) — mesmos 5 níveis do Movelly.
export const NIVEIS_PSE = [
  { valor: 1, nome: 'Muito leve', cor: '#90a4ae' },
  { valor: 2, nome: 'Leve', cor: '#66bb6a' },
  { valor: 3, nome: 'Moderado', cor: '#ffa726' },
  { valor: 4, nome: 'Forte', cor: '#ef6c00' },
  { valor: 5, nome: 'Muito forte', cor: '#e53935' },
] as const

// Zonas da ADTRISC (Z1–Z5, % da velocidade do teste — config_avaliacao).
export const CORES_ZONA = ['#42a5f5', '#66bb6a', '#ffa726', '#ef6c00', '#e53935'] as const

export const SITUACOES = {
  planejado: 'Planejado',
  feito: 'Feito',
  nao_feito: 'Não feito',
  parcial: 'Parcial',
} as const
export type Situacao = keyof typeof SITUACOES

export const OBJETIVOS = {
  manual: 'Manual',
  base: 'Base aeróbica',
  endurance: 'Resistência',
  speed: 'Velocidade',
  race_specific: 'Prova alvo',
  recovery: 'Recuperação',
} as const
export type Objetivo = keyof typeof OBJETIVOS

export const DIFICULDADES = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado', performance: 'Performance' } as const
export type Dificuldade = keyof typeof DIFICULDADES

/** Passo do treino (igual a training_steps do Movelly). */
export type Passo = {
  id?: string
  ordem: number
  tipo: TipoPasso
  titulo: string
  duracao_s: number | null
  distancia_m: number | null
  intensidade_tipo: Intensidade | null
  alvo_min: number | null
  alvo_max: number | null
  // 'zone' (alvo_min = nº da zona 1–5) | 'pace' (s/km; natação s/100m) | 'kmh' | 'bpm' | 'w' | 'rpe'
  alvo_unidade: string | null
  grupo_repeticao: number | null
  repeticoes: number | null
  aberto: boolean
  notas: string | null
}

export type SessaoBase = {
  titulo: string
  tipo: TipoSessao
  modalidade: Modalidade
  duracao_min: number | null
  distancia_km: number | null
  intensidade_tipo: Intensidade | null
  intensidade_alvo: string | null
  local: string | null
  chave: boolean
  notas: string | null
  passos: Passo[]
}
