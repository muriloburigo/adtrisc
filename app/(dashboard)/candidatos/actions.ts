'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CandidatoStatus } from '@/types/database'

async function assertStaff() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return supabase
}

export async function updateCandidatoStatus(
  id: string,
  status: CandidatoStatus,
): Promise<{ error?: string }> {
  const supabase = await assertStaff()
  const { error } = await supabase
    .from('candidatos')
    .update({ status })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/candidatos')
  revalidatePath(`/candidatos/${id}`)
  return {}
}

export async function saveObservacoesInternas(
  id: string,
  observacoes: string,
): Promise<{ error?: string }> {
  const supabase = await assertStaff()
  const { error } = await supabase
    .from('candidatos')
    .update({ observacoes_internas: observacoes || null })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/candidatos/${id}`)
  return {}
}
