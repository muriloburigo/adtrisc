'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { mmssToSeconds } from '@/lib/utils'
import { validatePassword } from '@/lib/password'
import type { ResetPasswordState } from '@/components/usuarios/ResetPasswordForm'
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

// Admin define uma nova senha para qualquer outra conta (treinador, outro
// admin...). A própria senha cada um troca em /conta, conferindo a atual.
export async function redefinirSenhaUsuario(
  userId: string,
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const actor = await assertAdmin()
  if (userId === actor.id) return { error: 'Para a sua própria senha, use "Minha conta".' }

  const password = (formData.get('password') as string) ?? ''
  const senhaFraca = validatePassword(password)
  if (senhaFraca) return { error: senhaFraca }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: alvo } = await admin.from('profiles').select('full_name, email').eq('id', userId).single()
  if (!alvo) return { error: 'Usuário não encontrado.' }

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return { error: 'Não foi possível redefinir a senha.' }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'senha', resource: 'usuario',
    resourceId: userId, resourceLabel: alvo.full_name ?? alvo.email,
  })
  return { done: true }
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

// Processos SGPE por projeto e ano — pré-preenchem relatório da turma, diário
// e ficha de inscrição (lib/processoSgpe.ts). `id` vazio = novo.
export async function salvarProcessoSgpe(formData: FormData): Promise<{ error?: string } | void> {
  const actor = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const id = String(formData.get('id') ?? '').trim()
  const projeto = String(formData.get('projeto') ?? '').replace(/\s+/g, ' ').trim()
  const processo = String(formData.get('processo') ?? '').replace(/\s+/g, ' ').trim()
  const ano = Number(formData.get('ano'))
  if (!projeto) return { error: 'Informe o projeto.' }
  if (!processo) return { error: 'Informe o processo (ex.: FESPORTE 5217/2025).' }
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return { error: 'Ano inválido.' }

  const dados = { projeto, ano, processo, updated_at: new Date().toISOString() }
  const { data: before } = id ? await supabase.from('processos_sgpe').select('projeto, ano, processo').eq('id', id).maybeSingle() : { data: null }
  const { data: salvo, error } = id
    ? await supabase.from('processos_sgpe').update(dados).eq('id', id).select('id').single()
    : await supabase.from('processos_sgpe').insert(dados).select('id').single()
  if (error || !salvo) {
    return { error: error?.code === '23505' ? 'Já existe esse projeto nesse ano.' : 'Erro ao salvar o processo.' }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: id ? 'editar' : 'criar', resource: 'config',
    resourceId: salvo.id, resourceLabel: `Processo SGPE ${processo} (${projeto}, ${ano})`,
    before, after: { projeto, ano, processo },
  })
  revalidatePath('/configuracoes')
  revalidatePath('/turmas', 'layout')
  revalidatePath('/diario', 'layout')
}

export async function excluirProcessoSgpe(id: string): Promise<{ error?: string } | void> {
  const actor = await assertAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: before, error } = await supabase.from('processos_sgpe').delete().eq('id', id).select('projeto, ano, processo').maybeSingle()
  if (error) return { error: 'Erro ao excluir o processo.' }
  if (!before) return { error: 'Processo não encontrado.' }

  // Turmas que apontavam para ele voltam a usar o processo do ano (on delete set null).
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'config',
    resourceId: id, resourceLabel: `Processo SGPE ${before.processo} (${before.projeto}, ${before.ano})`,
    before,
  })
  revalidatePath('/configuracoes')
  revalidatePath('/turmas', 'layout')
  revalidatePath('/diario', 'layout')
}
