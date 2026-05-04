export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type SexoEnum = 'M' | 'F' | 'outro'
export type CandidatoStatus = 'pendente' | 'sorteado' | 'nao_sorteado' | 'convertido'

export interface CandidatoRow {
  id: string
  turma_id: string | null
  status: CandidatoStatus
  email_responsavel: string | null
  aceite_termos: boolean
  nome: string
  data_nascimento: string | null
  sexo: string | null
  cpf: string | null
  endereco_completo: string | null
  escola_nome_endereco: string | null
  serie_escolar: string | null
  condicao_medica: boolean | null
  condicao_medica_descricao: string | null
  tratamento_medico: boolean | null
  tratamento_medico_descricao: string | null
  alergia: boolean | null
  alergia_descricao: string | null
  autorizacao_medica: boolean | null
  praticou_modalidade: boolean | null
  interesse_eventos: boolean | null
  como_soube: string | null
  responsavel_nome: string | null
  responsavel_telefone: string | null
  responsavel_email: string | null
  tem_bicicleta: boolean | null
  tamanho_camiseta: string | null
  observacoes_internas: string | null
  created_at: string
  updated_at: string
}
export type TurmaModalidade = 'natacao' | 'ciclismo' | 'corrida' | 'triathlon'
export type TurmaStatus = 'ativa' | 'inativa' | 'suspensa'
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type UserRole = 'admin' | 'coach' | 'aluno' | 'pai'
export type AlunoStatus = 'ativo' | 'inativo' | 'suspenso'
export type PagamentoStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado'
export type Parentesco = 'mae' | 'pai' | 'outro'

// Row types (what comes from DB)
export interface ProfileRow {
  id: string; email: string; full_name: string | null; role: UserRole
  avatar_url: string | null; created_at: string; updated_at: string
}
export interface TurmaRow {
  id: string; nome: string; modalidade: TurmaModalidade
  dias_semana: DiaSemana[]; horario_inicio: string; horario_fim: string
  coach_id: string | null; capacidade: number; status: TurmaStatus
  ano: number | null; semestre: 1 | 2 | null
  idade_min: number | null; idade_max: number | null
  observacoes: string | null; captacao_aberta: boolean; created_at: string; updated_at: string
}
export interface AlunoRow {
  id: string; profile_id: string | null; turma_id: string; nome: string
  telefone: string | null; sexo: SexoEnum | null; data_nascimento: string | null
  rua: string | null; numero: string | null; bairro: string | null
  cep: string | null; cidade: string | null; status: AlunoStatus
  observacoes: string | null; created_at: string; updated_at: string
}
export interface ResponsavelRow {
  id: string; profile_id: string | null; nome: string; cpf: string | null
  rg: string | null; email: string | null; telefone: string | null
  parentesco: Parentesco; created_at: string; updated_at: string
}
export interface AlunoResponsavelRow {
  aluno_id: string; responsavel_id: string; principal: boolean
}
export interface PagamentoRow {
  id: string; aluno_id: string; valor: number; vencimento: string
  pago_em: string | null; status: PagamentoStatus; descricao: string | null
  mes_referencia: string | null; created_at: string
}
export interface AvaliacaoFisicaRow {
  id: string; aluno_id: string; data: string
  massa_corporal: number | null; estatura: number | null
  perimetro_cintura: number | null; envergadura: number | null; estatura_sentado: number | null
  altura_cm: number | null; altura_ao_quadrado: number | null
  imc: number | null; rce: number | null
  sentar_alcancar: number | null; resistencia_6min: number | null
  forca_abdominal: number | null; arremesso_medicineball: number | null
  agilidade: number | null; salto_horizontal: number | null
  corrida_20m: number | null; natacao_12min: number | null
  observacoes: string | null; avaliador_id: string | null
  created_at: string; updated_at: string
}

export interface PresencaRow {
  id: string; turma_id: string; aluno_id: string; data: string
  presente: boolean; justificada: boolean; observacao: string | null
  registrado_por: string | null; created_at: string; updated_at: string
}
export type PresencaInsert = Omit<PresencaRow, 'id' | 'created_at' | 'updated_at'>

// Insert types (what you send to DB)
export type ProfileInsert = Omit<ProfileRow, 'created_at' | 'updated_at'>
export type TurmaInsert = Omit<TurmaRow, 'id' | 'created_at' | 'updated_at'>
export type AlunoInsert = Omit<AlunoRow, 'id' | 'created_at' | 'updated_at'>
export type ResponsavelInsert = Omit<ResponsavelRow, 'id' | 'created_at' | 'updated_at'>
export type AlunoResponsavelInsert = AlunoResponsavelRow
export type PagamentoInsert = Omit<PagamentoRow, 'id' | 'created_at'>
export type PresencaUpsert = Omit<PresencaRow, 'id' | 'created_at' | 'updated_at'>

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
      turmas: {
        Row: TurmaRow
        Insert: TurmaInsert
        Update: Partial<TurmaInsert>
      }
      alunos: {
        Row: AlunoRow
        Insert: AlunoInsert
        Update: Partial<AlunoInsert>
      }
      responsaveis: {
        Row: ResponsavelRow
        Insert: ResponsavelInsert
        Update: Partial<ResponsavelInsert>
      }
      aluno_responsavel: {
        Row: AlunoResponsavelRow
        Insert: AlunoResponsavelInsert
        Update: Partial<AlunoResponsavelInsert>
      }
      pagamentos: {
        Row: PagamentoRow
        Insert: PagamentoInsert
        Update: Partial<PagamentoInsert>
      }
      candidatos: {
        Row: CandidatoRow
        Insert: Omit<CandidatoRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CandidatoRow, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
