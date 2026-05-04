'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePassword } from '@/lib/password'
import { logAudit, getSessionUser } from '@/lib/audit'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function createCoach(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const admin    = createAdminClient() as AnyClient
  const actor    = await getSessionUser()
  const email    = (formData.get('email') as string).trim()
  const fullName = (formData.get('full_name') as string).trim()
  const password = formData.get('password') as string

  const pwErr = validatePassword(password)
  if (pwErr) return { error: pwErr }

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError || !authUser.user)
    return { error: authError?.message ?? 'Erro ao criar usuário.' }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: 'coach', full_name: fullName })
    .eq('id', authUser.user.id)

  if (profileError) return { error: profileError.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'treinador',
    resourceId: authUser.user.id, resourceLabel: fullName,
    after: { email, full_name: fullName, role: 'coach' },
  })

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function updateCoach(id: string, formData: FormData) {
  const admin    = createAdminClient() as AnyClient
  const actor    = await getSessionUser()
  const fullName = formData.get('full_name') as string
  const email    = formData.get('email') as string

  const { data: before } = await admin
    .from('profiles').select('full_name, email, role').eq('id', id).single()

  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, email })
    .eq('id', id)

  if (profileError) throw new Error(profileError.message)

  const { error: authError } = await admin.auth.admin.updateUserById(id, { email })
  if (authError) throw new Error(authError.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'treinador',
    resourceId: id, resourceLabel: fullName,
    before: before as Record<string, unknown>,
    after: { full_name: fullName, email },
  })

  revalidatePath('/coaches')
  revalidatePath(`/coaches/${id}`)
  redirect(`/coaches/${id}`)
}

export async function deleteCoach(id: string) {
  const admin = createAdminClient() as AnyClient
  const actor = await getSessionUser()

  const { data: before } = await admin
    .from('profiles').select('full_name, email, role').eq('id', id).single()

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'treinador',
    resourceId: id, resourceLabel: before?.full_name ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function resetPassword(
  id: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const admin    = createAdminClient() as AnyClient
  const actor    = await getSessionUser()
  const password = formData.get('password') as string

  const pwErr = validatePassword(password)
  if (pwErr) return { error: pwErr }

  const { data: profile } = await admin
    .from('profiles').select('full_name').eq('id', id).single()

  const { error } = await admin.auth.admin.updateUserById(id, { password })
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'senha', resource: 'treinador',
    resourceId: id, resourceLabel: profile?.full_name ?? null,
  })

  revalidatePath(`/coaches/${id}`)
  redirect(`/coaches/${id}`)
}
