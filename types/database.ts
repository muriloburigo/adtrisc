// ── Enums ─────────────────────────────────────────────────────────────────────

export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type TurmaModalidade = 'triathlon' | 'natacao' | 'ciclismo' | 'corrida' | 'duathlon'
export type TurmaStatus = 'ativa' | 'inativa' | 'suspensa'
export type AlunoStatus = 'ativo' | 'inativo' | 'desligado'
export type SexoEnum = 'M' | 'F'
export type Parentesco = 'mae' | 'pai' | 'outro'
export type UserRole = 'admin' | 'coach' | 'aluno' | 'pai'

// ── Tables ────────────────────────────────────────────────────────────────────

export type TurmaRow = {
  id: string
  nome: string
  status: TurmaStatus
  modalidade: TurmaModalidade
  coach_id: string | null
  capacidade: number | null
  ano: number | null
  semestre: number | null
  dias_semana: DiaSemana[]
  horario_inicio: string
  horario_fim: string
  idade_min: number | null
  idade_max: number | null
  captacao_aberta: boolean
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type AlunoRow = {
  id: string
  turma_id: string | null
  nome: string
  telefone: string | null
  sexo: SexoEnum | null
  data_nascimento: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  cep: string | null
  cidade: string | null
  observacoes: string | null
  foto_url: string | null
  status: AlunoStatus
  created_at: string
  updated_at: string
}

export type ResponsavelRow = {
  id: string
  nome: string | null
  cpf: string | null
  rg: string | null
  email: string | null
  telefone: string | null
  parentesco: Parentesco
  created_at: string
}

export type TurmaFotoRow = {
  id: string
  turma_id: string
  url: string
  titulo: string
  data: string
  storage_path: string
  created_at: string
}

export type AvaliacaoFisicaRow = {
  id: string
  aluno_id: string
  data: string
  massa_corporal: number | null
  estatura: number | null
  imc: number | null
  resistencia_6min: number | null
  forca_abdominal: number | null
  envergadura: number | null
  impulsao_vertical: number | null
  velocidade_20m: number | null
  flexibilidade: number | null
  observacoes: string | null
  created_at: string
}

export type HistoricoAtletaRow = {
  id: string
  aluno_id: string
  tipo: 'matricula' | 'mudanca_turma' | 'desligamento' | 'reativacao'
  data: string
  turma_id: string | null
  turma_nome: string | null
  turma_anterior_id: string | null
  turma_anterior_nome: string | null
  created_at: string
}

export type PresencaRow = {
  id: string
  aluno_id: string
  turma_id: string
  data: string
  presente: boolean
  justificada: boolean
  created_at: string
}

export type CandidatoRow = {
  id: string
  turma_id: string | null
  status: string
  email_responsavel: string | null
  aceite_termos: boolean
  nome: string
  data_nascimento: string | null
  sexo: string | null
  cpf: string | null
  endereco_completo: string | null
  escola_nome_endereco: string | null
  serie_escolar: string | null
  condicao_medica: boolean
  condicao_medica_descricao: string | null
  tratamento_medico: boolean
  tratamento_medico_descricao: string | null
  alergia: boolean
  alergia_descricao: string | null
  autorizacao_medica: boolean
  praticou_modalidade: boolean
  interesse_eventos: boolean
  como_soube: string | null
  responsavel_nome: string | null
  responsavel_telefone: string | null
  responsavel_email: string | null
  tem_bicicleta: boolean
  tamanho_camiseta: string | null
  observacoes_internas: string | null
  created_at: string
}

export type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

// Supabase Database shape (used by Supabase client helpers)
export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow }
      turmas:   { Row: TurmaRow }
      alunos:   { Row: AlunoRow }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
