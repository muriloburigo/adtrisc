'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'

export async function saveAvaliacao(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const alunoId = formData.get('aluno_id') as string
  const alunoNome = formData.get('aluno_nome') as string

  const massaCorporal = parseFloat(formData.get('massa_corporal') as string) || null
  const estatura      = parseFloat(formData.get('estatura') as string) || null
  const imc = massaCorporal && estatura ? parseFloat((massaCorporal / (estatura * estatura)).toFixed(2)) : null

  const payload = {
    aluno_id:          alunoId,
    data:              formData.get('data') as string,
    massa_corporal:    massaCorporal,
    estatura:          estatura,
    imc,
    resistencia_6min:  parseInt(formData.get('resistencia_6min') as string) || null,
    forca_abdominal:   parseInt(formData.get('forca_abdominal') as string) || null,
    envergadura:       parseFloat(formData.get('envergadura') as string) || null,
    impulsao_vertical: parseFloat(formData.get('impulsao_vertical') as string) || null,
    velocidade_20m:    parseFloat(formData.get('velocidade_20m') as string) || null,
    flexibilidade:     parseFloat(formData.get('flexibilidade') as string) || null,
    observacoes:       (formData.get('observacoes') as string)?.trim() || null,
  }

  const { data: result, error } = await db
    .from('avaliacoes_fisicas').insert(payload).select('id').single()

  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'atleta',
    resourceId: alunoId, resourceLabel: `Avaliação de ${alunoNome}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/alunos/${alunoId}/avaliacoes`)
  revalidatePath('/avaliacoes')

  return result?.id as string
}

export async function saveAvaliacaoField(
  alunoId: string,
  data: string,
  field: string,
  value: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  await requireStaff()

  const numValue = value === '' ? null : parseFloat(value) || parseInt(value) || null

  // Check if record exists for this aluno+data (ignore soft-deleted)
  const { data: existing } = await db
    .from('avaliacoes_fisicas')
    .select('id, massa_corporal, estatura')
    .eq('aluno_id', alunoId)
    .eq('data', data)
    .is('deleted_at', null)
    .single()

  if (existing) {
    const update: Record<string, unknown> = { [field]: numValue }
    // Recalculate IMC if weight or height changed
    const massa = field === 'massa_corporal' ? numValue as number : existing.massa_corporal
    const alt   = field === 'estatura'       ? numValue as number : existing.estatura
    if (massa && alt) update.imc = parseFloat((massa / (alt * alt)).toFixed(2))
    await db.from('avaliacoes_fisicas').update(update).eq('id', existing.id)
  } else {
    const insert: Record<string, unknown> = {
      aluno_id: alunoId,
      data,
      [field]: numValue,
    }
    await db.from('avaliacoes_fisicas').insert(insert)
  }

  revalidatePath('/avaliacoes')
}

export async function deleteAvaliacao(id: string, alunoId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  await requireStaff()
  await db.from('avaliacoes_fisicas').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/alunos/${alunoId}/avaliacoes`)
  revalidatePath('/avaliacoes')
}

export async function deleteAvaliacoes(
  turmaId: string,
  data: string,
  turmaNome: string,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  // Get aluno IDs for this turma
  const { data: alunosRaw } = await db
    .from('alunos').select('id').eq('turma_id', turmaId).eq('status', 'ativo')
  const alunoIds = (alunosRaw ?? []).map((a: { id: string }) => a.id)

  if (alunoIds.length === 0) return

  const { error } = await db
    .from('avaliacoes_fisicas')
    .update({ deleted_at: new Date().toISOString() })
    .in('aluno_id', alunoIds)
    .eq('data', data)
    .is('deleted_at', null)

  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'atleta',
    resourceId: turmaId,
    resourceLabel: `Avaliação ${turmaNome} — ${data}`,
  })

  revalidatePath('/avaliacoes')
}
