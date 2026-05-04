'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'criar' | 'editar' | 'excluir' | 'senha' | 'status' | 'sorteio'

export type AuditResource =
  | 'turma' | 'atleta' | 'treinador' | 'candidato' | 'usuario'

export interface AuditParams {
  userId:        string
  userName:      string
  action:        AuditAction
  resource:      AuditResource
  resourceId:    string
  resourceLabel?: string | null
  before?:       Record<string, unknown> | null
  after?:        Record<string, unknown> | null
  metadata?:     Record<string, unknown> | null
}

// Fields stripped from before/after (noise or sensitive)
const OMIT = new Set([
  'id', 'created_at', 'updated_at', 'password',
  'avatar_url', 'captacao_aberta',
])

function sanitize(obj: Record<string, unknown> | null | undefined) {
  if (!obj) return null
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !OMIT.has(k)))
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await admin.from('audit_logs').insert({
      user_id:        params.userId   || null,
      user_name:      params.userName,
      action:         params.action,
      resource:       params.resource,
      resource_id:    params.resourceId,
      resource_label: params.resourceLabel ?? null,
      before_data:    sanitize(params.before),
      after_data:     sanitize(params.after),
      metadata:       params.metadata ?? null,
    })
  } catch {
    // Audit logging must never fail the main operation
  }
}

/** Fetches the logged-in user's id + display name. Cheap: getUser() uses cached JWT. */
export async function getSessionUser(): Promise<{ id: string; name: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: '', name: 'Sistema' }
    const { data: p } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single()
    return { id: user.id, name: p?.full_name ?? user.email ?? 'Desconhecido' }
  } catch {
    return { id: '', name: 'Desconhecido' }
  }
}
