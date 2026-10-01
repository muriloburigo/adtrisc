'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'

// Assinatura do treinador: o próprio usuário (Minha conta) ou um admin
// (Treinadores → Editar) cadastra. `assinatura` null = remover.
export async function salvarAssinatura(perfilId: string, assinatura: string | null): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Entre de novo.' }
  const { data: eu } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  // Autoriza aqui dentro (a ação usa service role): só a própria assinatura,
  // ou admin cadastrando a de um treinador/admin.
  const ehProprio = user.id === perfilId
  if (!ehProprio && eu?.role !== 'admin') return { error: 'Acesso negado.' }

  if (assinatura != null && (!assinatura.startsWith('data:image/png;base64,') || assinatura.length > 400_000 || assinatura.length < 2000)) {
    return { error: 'Assinatura inválida. Desenhe de novo.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: alvo } = await admin.from('profiles').select('full_name, role').eq('id', perfilId).single()
  if (!alvo || !['admin', 'coach'].includes(alvo.role)) return { error: 'Usuário não encontrado.' }

  const { error } = await admin
    .from('profiles')
    .update({ assinatura, assinatura_atualizada_em: assinatura ? new Date().toISOString() : null })
    .eq('id', perfilId)
  if (error) return { error: 'Não foi possível salvar a assinatura.' }

  // Nunca grava a imagem na auditoria — só o fato.
  await logAudit({
    userId: user.id, userName: eu?.full_name ?? user.email ?? user.id,
    action: assinatura ? 'editar' : 'excluir', resource: alvo.role === 'coach' ? 'treinador' : 'usuario',
    resourceId: perfilId, resourceLabel: `Assinatura de ${alvo.full_name ?? ''} ${assinatura ? 'cadastrada' : 'removida'}`,
  })

  revalidatePath('/conta')
  revalidatePath(`/coaches/${perfilId}/editar`)
}
