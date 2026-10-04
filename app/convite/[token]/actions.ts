'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { validarNovaSenha } from '@/lib/password'
import { loginParaEmail, validarEmail, validarUsuario } from '@/lib/portal'
import { lerConvite } from '@/lib/portalConvite'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
export type ConviteState = { error?: string } | null

export async function aceitarConvite(token: string, _prev: ConviteState, fd: FormData): Promise<ConviteState> {
  const convite = await lerConvite(token)
  if (!convite?.valido) return { error: 'Este link não vale mais. Peça um novo ao treinador.' }
  const senha = String(fd.get('senha') ?? '')
  const erroSenha = validarNovaSenha(senha, String(fd.get('confirmacao') ?? ''))
  if (erroSenha) return { error: erroSenha }
  if (fd.get('aceite') !== 'on') return { error: 'É preciso concordar com a política de privacidade.' }

  const admin = createAdminClient() as Db
  // Marca como usado ANTES de criar a conta: dois envios simultâneos não criam duas contas.
  const { data: reservado } = await admin.from('portal_convites').update({ usado_em: new Date().toISOString() })
    .eq('id', convite.id).is('usado_em', null).select('id').maybeSingle()
  if (!reservado) return { error: 'Este link já foi usado.' }
  const devolver = () => admin.from('portal_convites').update({ usado_em: null }).eq('id', convite.id)

  let email: string
  let userId: string
  if (convite.tipo === 'criar') {
    const modo = fd.get('modo') === 'email' ? 'email' : 'usuario'
    const login = String(fd.get('login') ?? '').trim().toLowerCase()
    const erroLogin = modo === 'email' ? validarEmail(login) : validarUsuario(login)
    if (erroLogin) { await devolver(); return { error: erroLogin } }
    email = loginParaEmail(login)
    const { data, error } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true, user_metadata: { full_name: convite.aluno.nome },
    })
    if (error || !data?.user) {
      await devolver()
      const jaExiste = /already|registered|exists/i.test(error?.message ?? '')
      return { error: jaExiste ? (modo === 'email' ? 'Esse e-mail já tem conta. Use outro.' : 'Esse usuário já existe. Escolha outro.') : 'Não foi possível criar a conta. Tente de novo.' }
    }
    userId = data.user.id
    // O trigger cria o perfil com o papel padrão 'aluno'; garante mesmo assim.
    await admin.from('profiles').update({ role: 'aluno', full_name: convite.aluno.nome }).eq('id', userId)
    const { data: ligado } = await admin.from('alunos').update({ profile_id: userId }).eq('id', convite.aluno.id).is('profile_id', null).select('id').maybeSingle()
    if (!ligado) {
      await admin.auth.admin.deleteUser(userId)
      return { error: 'Este atleta já tem uma conta. Peça ao treinador um link de nova senha.' }
    }
  } else {
    userId = convite.aluno.profile_id!
    const { data: u } = await admin.auth.admin.getUserById(userId)
    const { data: perfil } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (!u?.user?.email || perfil?.role !== 'aluno') { await devolver(); return { error: 'Conta não encontrada. Fale com o treinador.' } }
    email = u.user.email
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha })
    if (error) { await devolver(); return { error: 'Não foi possível trocar a senha. Tente de novo.' } }
  }

  await logAudit({
    userId, userName: convite.aluno.nome, action: convite.tipo === 'criar' ? 'criar' : 'senha', resource: 'portal',
    resourceId: convite.aluno.id, resourceLabel: convite.tipo === 'criar' ? 'Criou a conta do portal pelo convite' : 'Definiu nova senha pelo link',
  })

  // Já entra logado.
  const db = (await createClient()) as Db
  await db.auth.signOut({ scope: 'local' })
  const { error } = await db.auth.signInWithPassword({ email, password: senha })
  if (error) redirect('/login')
  redirect('/portal')
}
