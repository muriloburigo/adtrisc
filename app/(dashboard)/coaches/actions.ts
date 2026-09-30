'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { requireAdmin, type Actor } from '@/lib/assert'
import { validatePassword } from '@/lib/password'

type ActionState = { error: string } | { done: true } | null

// Todas as ações abaixo usam o client service role (ignora RLS e mexe em
// auth.users), então a checagem de admin tem que ficar AQUI — proteger só a
// página não basta: uma server action pode ser chamada direto, sem passar por ela.
async function exigirAdmin(): Promise<Actor | null> {
  try { return await requireAdmin() } catch { return null }
}

// Estas telas só gerenciam treinadores: nunca agir sobre admin/aluno/pai por aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function perfilDeTreinador(admin: any, id: string): Promise<{ full_name: string | null } | null> {
  const { data } = await admin.from('profiles').select('full_name, role').eq('id', id).single()
  return data?.role === 'coach' ? data : null
}

export async function createCoach(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const actor = await exigirAdmin()
  if (!actor) return { error: 'Acesso negado.' }

  const full_name  = (formData.get('full_name') as string)?.trim()
  const email      = (formData.get('email') as string)?.trim()
  const password   = formData.get('password') as string
  const cref       = (formData.get('cref') as string)?.trim() || null
  const avatar_url = (formData.get('avatar_url') as string)?.trim() || null

  if (!full_name || !email || !password) return { error: 'Preencha todos os campos.' }
  const senhaFraca = validatePassword(password)
  if (senhaFraca) return { error: senhaFraca }

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
    avatar_url,
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
  const actor = await exigirAdmin()
  if (!actor) throw new Error('Acesso negado.')

  const profile = await perfilDeTreinador(admin, id)
  if (!profile) throw new Error('Treinador não encontrado.')

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
  const actor = await exigirAdmin()
  if (!actor) return { error: 'Acesso negado.' }
  const coach = await perfilDeTreinador(admin, coachId)
  if (!coach) return { error: 'Treinador não encontrado.' }

  const password = (formData.get('password') as string) ?? ''
  const senhaFraca = validatePassword(password)
  if (senhaFraca) return { error: senhaFraca }

  const { error } = await admin.auth.admin.updateUserById(coachId, { password })
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'senha', resource: 'treinador',
    resourceId: coachId, resourceLabel: coach.full_name,
  })

  revalidatePath(`/coaches/${coachId}/editar`)
  return { done: true }
}

export async function updateCoachAvatar(id: string, url: string | null): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const actor = await exigirAdmin()
  if (!actor) return { error: 'Acesso negado.' }
  if (!(await perfilDeTreinador(admin, id))) return { error: 'Treinador não encontrado.' }

  const { error } = await admin.from('profiles').update({ avatar_url: url }).eq('id', id)
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'treinador',
    resourceId: id, resourceLabel: null,
    after: { avatar_url: url },
  })

  revalidatePath('/coaches')
  revalidatePath(`/coaches/${id}/editar`)
  return {}
}

export async function updateCoach(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const actor = await exigirAdmin()
  if (!actor) return { error: 'Acesso negado.' }
  if (!(await perfilDeTreinador(supabase, id))) return { error: 'Treinador não encontrado.' }

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
