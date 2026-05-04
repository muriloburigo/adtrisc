'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function createCoach(formData: FormData) {
  const admin = createAdminClient() as AnyClient

  const email     = formData.get('email') as string
  const fullName  = formData.get('full_name') as string
  const password  = formData.get('password') as string

  // 1. Cria o usuário no Supabase Auth
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError || !authUser.user) {
    throw new Error(authError?.message ?? 'Erro ao criar usuário')
  }

  // 2. Atualiza o perfil gerado pelo trigger
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: 'coach', full_name: fullName })
    .eq('id', authUser.user.id)

  if (profileError) throw new Error(profileError.message)

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function updateCoach(id: string, formData: FormData) {
  const admin = createAdminClient() as AnyClient

  const fullName = formData.get('full_name') as string
  const email    = formData.get('email') as string

  // Atualiza profile
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name: fullName, email })
    .eq('id', id)

  if (profileError) throw new Error(profileError.message)

  // Atualiza email no auth se necessário
  const { error: authError } = await admin.auth.admin.updateUserById(id, { email })
  if (authError) throw new Error(authError.message)

  revalidatePath('/coaches')
  revalidatePath(`/coaches/${id}`)
  redirect(`/coaches/${id}`)
}

export async function deleteCoach(id: string) {
  const admin = createAdminClient() as AnyClient

  // Deleta o usuário do auth (cascade apaga o profile)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) throw new Error(error.message)

  revalidatePath('/coaches')
  redirect('/coaches')
}

export async function resetPassword(id: string, formData: FormData) {
  const admin = createAdminClient() as AnyClient
  const newPassword = formData.get('password') as string

  const { error } = await admin.auth.admin.updateUserById(id, { password: newPassword })
  if (error) throw new Error(error.message)

  revalidatePath(`/coaches/${id}`)
  redirect(`/coaches/${id}`)
}
