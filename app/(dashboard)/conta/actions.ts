'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { validarNovaSenha } from '@/lib/password'

export type TrocaSenhaState = { error?: string; ok?: boolean } | null

// Qualquer usuário logado troca a própria senha. Confere a senha atual antes,
// para que uma sessão esquecida aberta em outro computador não baste.
export async function alterarMinhaSenha(_prev: TrocaSenhaState, formData: FormData): Promise<TrocaSenhaState> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Sessão expirada. Entre de novo.' }

  const atual = (formData.get('senha_atual') as string) ?? ''
  const nova = (formData.get('nova_senha') as string) ?? ''
  const erro = validarNovaSenha(nova, (formData.get('confirmacao') as string) ?? '')
  if (erro) return { error: erro }
  if (nova === atual) return { error: 'A nova senha precisa ser diferente da atual.' }

  // Cliente avulso, sem cookies: só valida a senha atual, sem mexer na sessão do navegador.
  const verificador = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: senhaErrada } = await verificador.auth.signInWithPassword({ email: user.email, password: atual })
  if (senhaErrada) return { error: 'Senha atual incorreta.' }
  await verificador.auth.signOut({ scope: 'local' })

  const { error } = await supabase.auth.updateUser({ password: nova })
  if (error) return { error: 'Não foi possível alterar a senha. Tente de novo.' }

  const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  await logAudit({
    userId: user.id, userName: p?.full_name ?? user.email,
    action: 'senha', resource: 'usuario',
    resourceId: user.id, resourceLabel: 'Alterou a própria senha',
  })
  return { ok: true }
}
