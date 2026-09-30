'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { mmssToSeconds } from '@/lib/utils'
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

// Parâmetros das avaliações: limites das zonas (% da velocidade do teste),
// altura padrão do banco da estatura sentado e corte do 100 m para a equipe.
export async function updateConfigAvaliacao(formData: FormData): Promise<{ error?: string } | void> {
  const actor = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const limites = [1, 2, 3, 4, 5].map((z) => Number(formData.get(`z${z}`)))
  if (limites.some((v) => !Number.isFinite(v) || v <= 0)) return { error: 'Preencha os 5 limites das zonas.' }
  if (limites.some((v, i) => i > 0 && v <= limites[i - 1])) return { error: 'Cada zona precisa terminar acima da anterior.' }

  const banco = Number(formData.get('altura_banco_padrao'))
  if (!Number.isFinite(banco) || banco < 0) return { error: 'Altura do banco inválida.' }

  const corteTxt = ((formData.get('natacao_100m_corte') as string) ?? '').trim()
  let corte: number | null = null
  if (corteTxt) {
    corte = mmssToSeconds(corteTxt)
    if (corte == null) return { error: 'Corte do 100 m no formato MM:SS ou MM:SS.cc.' }
  }

  const { data: before } = await supabase.from('config_avaliacao').select('*').eq('id', 1).maybeSingle()
  const after = { zona_limites: limites, altura_banco_padrao: banco, natacao_100m_corte_s: corte, updated_at: new Date().toISOString() }
  const { data: saved, error } = await supabase
    .from('config_avaliacao').update(after).eq('id', 1).select('id').single()
  if (error || !saved) return { error: 'Erro ao salvar as configurações.' }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'config',
    resourceId: 'config_avaliacao', resourceLabel: 'Configurações das avaliações',
    before, after,
  })

  revalidatePath('/configuracoes')
  revalidatePath('/avaliacoes', 'layout')
  revalidatePath('/alunos', 'layout')
}
