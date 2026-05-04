export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'coach' | 'athlete'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      athletes: {
        Row: {
          id: string
          profile_id: string
          coach_id: string | null
          birth_date: string | null
          phone: string | null
          emergency_contact: string | null
          modality: 'sprint' | 'olimpico' | 'meio' | 'ironman' | null
          status: 'ativo' | 'inativo' | 'suspenso'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['athletes']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['athletes']['Insert']>
      }
      training_plans: {
        Row: {
          id: string
          athlete_id: string
          coach_id: string
          title: string
          description: string | null
          start_date: string
          end_date: string | null
          status: 'ativo' | 'concluido' | 'pausado'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['training_plans']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['training_plans']['Insert']>
      }
      sessions: {
        Row: {
          id: string
          plan_id: string
          date: string
          sport: 'natacao' | 'ciclismo' | 'corrida' | 'musculacao' | 'outro'
          duration_minutes: number | null
          distance_km: number | null
          description: string | null
          completed: boolean
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sessions']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['sessions']['Insert']>
      }
      payments: {
        Row: {
          id: string
          athlete_id: string
          amount: number
          due_date: string
          paid_at: string | null
          status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
