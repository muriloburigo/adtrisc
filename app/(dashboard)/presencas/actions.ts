'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()

  const rows = entries.map((e) => ({
    turma_id: turmaId,
    aluno_id: e.alunoId,
    data,
    presente: e.presente,
    justificada: e.presente ? false : e.justificada,
    registrado_por: user?.id ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('presencas')
    .upsert(rows, { onConflict: 'turma_id,aluno_id,data' })

  if (error) throw new Error(error.message)

  revalidatePath(`/presencas/${turmaId}/${data}`)
  revalidatePath('/presencas')
  redirect(`/presencas/${turmaId}/${data}?saved=1`)
}
