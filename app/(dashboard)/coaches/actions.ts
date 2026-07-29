'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { logAudit, getSessionUser } from '@/lib/audit'

type ActionState = { error: string } | { done: true } | null

export async function createCoach(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const actor = await getSessionUser()

  const full_name = (formData.get('full_name') as string)?.trim()
  const email     = (formData.get('email') as string)?.trim()
  const password  = formData.get('password') as string
  const cref      = (formData.get('cref') as string)?.trim() || null

  if (!full_name || !email || !password) return { error: 'Preencha todos os campos.' }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (authError || !authData?.user) {
    return { error: authError?.message ?? 'Erro ao criar usuário.' }
  }

  await admin.from('profiles').upsert({
    id: authData.user.id,
    full_name,
    email,
    role: 'coach',
    cref,
  })

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'treinador',
    resourceId: authData.user.id, resourceLabel: full_name,
    after: { full_name, email, role: 'coach' },
  })

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function deleteCoach(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const actor = await getSessionUser()

  const { data: profile } = await admin
    .from('profiles').select('full_name').eq('id', id).single()

  await admin.auth.admin.deleteUser(id)
  await admin.from('profiles').delete().eq('id', id)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'treinador',
    resourceId: id, resourceLabel: profile?.full_name ?? null,
    before: { full_name: profile?.full_name },
  })

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function resetPassword(
  coachId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const actor = await getSessionUser()

  const password = formData.get('password') as string
  if (!password || password.length < 6) return { error: 'A senha deve ter pelo menos 6 caracteres.' }

  const { error } = await admin.auth.admin.updateUserById(coachId, { password })
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'senha', resource: 'treinador',
    resourceId: coachId,
  })

  revalidatePath(`/coaches/${coachId}/editar`)
  return null
}

export async function updateCoach(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const actor = await getSessionUser()

  const full_name = (formData.get('full_name') as string)?.trim()
  const cref      = (formData.get('cref') as string)?.trim() || null
  if (!full_name) return { error: 'Nome é obrigatório.' }

  const { data: before } = await supabase
    .from('profiles').select('full_name, cref').eq('id', id).single()

  await supabase.from('profiles').update({ full_name, cref }).eq('id', id)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'treinador',
    resourceId: id, resourceLabel: full_name,
    before: before as Record<string, unknown>,
    after: { full_name, cref },
  })

  revalidatePath('/coaches')
  revalidatePath(`/coaches/${id}/editar`)
  return { done: true }
}
