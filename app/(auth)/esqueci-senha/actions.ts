'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type PedidoState = { enviado?: boolean; error?: string } | null

// Pede ao Supabase o e-mail com o link de redefinição. A resposta é sempre a
// mesma, exista ou não a conta — não dá para usar esta tela para descobrir
// quais e-mails estão cadastrados.
export async function solicitarRedefinicao(_prev: PedidoState, formData: FormData): Promise<PedidoState> {
  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Informe um e-mail válido.' }

  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host')}`
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  })
  if (error?.status === 429) return { error: 'Muitos pedidos seguidos. Aguarde alguns minutos e tente de novo.' }
  if (error) console.error('[esqueci-senha]', error.message)
  return { enviado: true }
}
