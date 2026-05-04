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
): Promise<{ error?: string }> {
  try {
    const actor = await requireStaff()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = (await createClient()) as any

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

    revalidatePath(`/presencas/${turmaId}/${data}`)
    revalidatePath('/presencas')
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

    const { error } = await supabase
      .from('presencas')
      .delete()
      .eq('turma_id', turmaId)
      .eq('data', data)

    if (error) return { error: error.message }

    await logAudit({
      userId: actor.id, userName: actor.name,
      action: 'excluir', resource: 'presenca' as never,
      resourceId: `${turmaId}__${data}`,
      resourceLabel: `${turmaNome} — ${data}`,
    })

    revalidatePath('/presencas')
    return {}
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir presenças' }
  }
}
