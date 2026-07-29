'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'

export async function navigateToPresenca(formData: FormData) {
  const turmaId = formData.get('turma_id') as string
  const data    = formData.get('data') as string
  if (!turmaId || !data) return
  redirect(`/presencas/${turmaId}/${data}`)
}

export type EntradaPresenca = {
  alunoId: string
  presente: boolean
  justificada: boolean
}

export async function savePresencas(
  turmaId: string,
  data: string,
  entries: EntradaPresenca[],
  turmaNome: string,
): Promise<{ error?: string }> {
  try {
    const actor = await requireStaff()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any

    // Determine if this is a new session or an update (ignore soft-deleted rows)
    const { count: existing } = await supabase
      .from('presencas')
      .select('*', { count: 'exact', head: true })
      .eq('turma_id', turmaId)
      .eq('data', data)
      .is('deleted_at', null)

    const rows = entries.map((e) => ({
      turma_id: turmaId,
      aluno_id: e.alunoId,
      data,
      presente: e.presente,
      justificada: e.presente ? false : e.justificada,
      registrado_por: actor.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('presencas')
      .upsert(rows, { onConflict: 'turma_id,aluno_id,data' })

    if (error) return { error: error.message }

    const presentes    = entries.filter((e) => e.presente).length
    const faltas       = entries.filter((e) => !e.presente && !e.justificada).length
    const justificadas = entries.filter((e) => !e.presente && e.justificada).length

    await logAudit({
      userId: actor.id, userName: actor.name,
      action: existing ? 'editar' : 'criar',
      resource: 'presenca',
      resourceId: `${turmaId}__${data}`,
      resourceLabel: `${turmaNome} — ${data}`,
      metadata: { total: entries.length, presentes, faltas, justificadas },
    })

    // Auto-create diary entry for this day if one doesn't exist yet
    const { data: turma } = await supabase
      .from('turmas').select('coach_id').eq('id', turmaId).single()

    if (turma?.coach_id) {
      const { data: existingRegistro } = await supabase
        .from('registros_aula')
        .select('id')
        .eq('coach_id', turma.coach_id)
        .eq('data', data)
        .maybeSingle()

      let registroId: string | null = existingRegistro?.id ?? null

      if (!registroId) {
        const { data: novo } = await supabase
          .from('registros_aula')
          .insert({ coach_id: turma.coach_id, data, modalidade: 'corrida' })
          .select('id')
          .single()
        registroId = novo?.id ?? null
      }

      if (registroId) {
        await supabase
          .from('registro_aula_turmas')
          .upsert(
            { registro_aula_id: registroId, turma_id: turmaId, descricao: null },
            { onConflict: 'registro_aula_id,turma_id', ignoreDuplicates: true }
          )
      }
    }

    revalidatePath(`/presencas/${turmaId}/${data}`)
    revalidatePath('/presencas')
    revalidatePath('/diario')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro ao salvar presenças' }
  }
}

export async function deletePresencas(
  turmaId: string,
  data: string,
  turmaNome: string,
): Promise<{ error?: string }> {
  try {
    const actor = await requireStaff()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any

    const { count: total } = await supabase
      .from('presencas')
      .select('*', { count: 'exact', head: true })
      .eq('turma_id', turmaId)
      .eq('data', data)
      .is('deleted_at', null)

    if ((total ?? 0) === 0) return { error: 'Nenhum registro encontrado para excluir.' }

    const { error } = await supabase
      .from('presencas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('turma_id', turmaId)
      .eq('data', data)
      .is('deleted_at', null)

    if (error) return { error: error.message }

    await logAudit({
      userId: actor.id, userName: actor.name,
      action: 'excluir', resource: 'presenca',
      resourceId: `${turmaId}__${data}`,
      resourceLabel: `${turmaNome} — ${data}`,
    })

    revalidatePath('/presencas')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir presenças' }
  }
}
