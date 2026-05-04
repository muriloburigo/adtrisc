'use server'

import { createClient } from '@/lib/supabase/server'

export type Actor = { id: string; name: string }

async function getActor(allowedRoles: string[]): Promise<Actor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data: p } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()

  if (!p || !allowedRoles.includes(p.role)) throw new Error('Acesso negado')

  return { id: user.id, name: p.full_name ?? user.email ?? user.id }
}

/** Admin ou Coach */
export async function requireStaff(): Promise<Actor> {
  return getActor(['admin', 'coach'])
}

/** Apenas Admin */
export async function requireAdmin(): Promise<Actor> {
  return getActor(['admin'])
}
