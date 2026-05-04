'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/database'

async function assertAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return user.id as string
}

export async function updateUser(
  userId: string,
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const meId = await assertAdmin()
  void meId

  const fullName = String(formData.get('full_name') ?? '').trim()
  const role     = String(formData.get('role') ?? '') as UserRole

  if (!fullName) return { error: 'Nome é obrigatório.' }
  if (!['admin', 'coach', 'aluno', 'pai'].includes(role)) return { error: 'Perfil inválido.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/configuracoes')
  redirect('/configuracoes')
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const meId = await assertAdmin()

  if (userId === meId) return { error: 'Você não pode excluir sua própria conta.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/configuracoes')
  return {}
}
