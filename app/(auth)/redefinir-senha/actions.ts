'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { validarNovaSenha } from '@/lib/password'

export type RedefinirState = { error?: string } | null

// Chamada com a sessão aberta pelo link do e-mail (/auth/callback).
export async function definirNovaSenha(_prev: RedefinirState, formData: FormData): Promise<RedefinirState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'O link expirou. Peça um novo em "Esqueci minha senha".' }

  const nova = (formData.get('nova_senha') as string) ?? ''
  const erro = validarNovaSenha(nova, (formData.get('confirmacao') as string) ?? '')
  if (erro) return { error: erro }

  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return { error: 'Não foi possível salvar a nova senha. Tente de novo.' }

  const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  await logAudit({
    userId: user.id, userName: p?.full_name ?? user.email ?? user.id,
    action: 'senha', resource: 'usuario',
    resourceId: user.id, resourceLabel: 'Redefiniu a senha pelo e-mail',
  })
  redirect('/dashboard')
}
