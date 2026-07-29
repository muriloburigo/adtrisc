'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import type { UserRole } from '@/types/database'

async function assertAdmin() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return { id: user.id as string, name: (profile?.full_name ?? 'Admin') as string }
}

export async function updateUser(
  userId: string,
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const actor = await assertAdmin()

  const fullName = String(formData.get('full_name') ?? '').trim()
  const role     = String(formData.get('role') ?? '') as UserRole

  if (!fullName) return { error: 'Nome é obrigatório.' }
  if (!['admin', 'coach', 'aluno', 'pai'].includes(role)) return { error: 'Perfil inválido.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  // profiles só tem policy de update para o próprio usuário (auth.uid() = id);
  // admin editando o perfil de outra pessoa precisa do client de service role.
  const admin = createAdminClient() as any

  const { data: before } = await supabase
    .from('profiles').select('full_name, email, role').eq('id', userId).single()

  const { error } = await admin
    .from('profiles')
    .update({ full_name: fullName, role })
    .eq('id', userId)

  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'usuario',
    resourceId: userId, resourceLabel: fullName,
    before: before as Record<string, unknown>,
    after: { full_name: fullName, role },
  })

  revalidatePath('/configuracoes')
  redirect('/configuracoes')
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const actor = await assertAdmin()

  if (userId === actor.id) return { error: 'Você não pode excluir sua própria conta.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: before } = await supabase
    .from('profiles').select('full_name, email, role').eq('id', userId).single()

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'usuario',
    resourceId: userId, resourceLabel: before?.full_name ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/configuracoes')
  return {}
}
