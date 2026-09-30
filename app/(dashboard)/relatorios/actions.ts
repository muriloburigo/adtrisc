'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'

// Relatórios salvos são pessoais: tudo passa pelo client normal, e a RLS de
// relatorios_salvos só deixa cada usuário ver/alterar os próprios.

export type RelatorioSalvo = { id: string; nome: string; estado: unknown; updated_at: string }

const LIMITE_ESTADO = 20_000 // caracteres de JSON — sobra muito para filtros/colunas

/** Salva (ou substitui, se já houver um com o mesmo nome) o relatório atual. */
export async function salvarRelatorio(nome: string, estado: unknown): Promise<{ error?: string; relatorio?: RelatorioSalvo }> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any

  const n = nome.replace(/\s+/g, ' ').trim()
  if (!n) return { error: 'Dê um nome ao relatório.' }
  if (n.length > 80) return { error: 'Nome muito longo (máx. 80 caracteres).' }
  if (!estado || typeof estado !== 'object' || JSON.stringify(estado).length > LIMITE_ESTADO) {
    return { error: 'Relatório inválido.' }
  }

  const { data: existente } = await db.from('relatorios_salvos').select('id').eq('user_id', actor.id).eq('nome', n).maybeSingle()
  const { data, error } = await db
    .from('relatorios_salvos')
    .upsert({ user_id: actor.id, nome: n, estado, updated_at: new Date().toISOString() }, { onConflict: 'user_id,nome' })
    .select('id, nome, estado, updated_at')
    .single()
  if (error || !data) return { error: friendlyError(error, 'Erro ao salvar o relatório.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: existente ? 'editar' : 'criar', resource: 'relatorio',
    resourceId: data.id, resourceLabel: n,
  })
  revalidatePath('/relatorios')
  return { relatorio: data as RelatorioSalvo }
}

export async function excluirRelatorio(id: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any

  const { data, error } = await db.from('relatorios_salvos').delete().eq('id', id).eq('user_id', actor.id).select('nome').maybeSingle()
  if (error) return { error: friendlyError(error, 'Erro ao excluir o relatório.') }
  if (!data) return { error: 'Relatório não encontrado.' }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'relatorio',
    resourceId: id, resourceLabel: data.nome,
  })
  revalidatePath('/relatorios')
  return {}
}
