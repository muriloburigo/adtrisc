'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit, getSessionUser } from '@/lib/audit'
import type { DiaSemana, TurmaModalidade, TurmaStatus } from '@/types/database'

export async function createTurma(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await getSessionUser()
  const dias = formData.getAll('dias_semana') as DiaSemana[]

  const semestreRaw = formData.get('semestre') as string
  const idadeMinRaw = formData.get('idade_min') as string
  const idadeMaxRaw = formData.get('idade_max') as string

  const payload = {
    nome:            formData.get('nome') as string,
    modalidade:      formData.get('modalidade') as TurmaModalidade,
    dias_semana:     dias,
    horario_inicio:  formData.get('horario_inicio') as string,
    horario_fim:     formData.get('horario_fim') as string,
    coach_id:        (formData.get('coach_id') as string) || null,
    capacidade:      Number(formData.get('capacidade')),
    ano:             Number(formData.get('ano')) || null,
    semestre:        semestreRaw ? (Number(semestreRaw) as 1 | 2) : null,
    idade_min:       idadeMinRaw ? Number(idadeMinRaw) : null,
    idade_max:       idadeMaxRaw ? Number(idadeMaxRaw) : null,
    observacoes:     (formData.get('observacoes') as string) || null,
    captacao_aberta: formData.get('captacao_aberta') === 'true',
    status:          'ativa' as TurmaStatus,
  }

  const { data, error } = await supabase.from('turmas').insert(payload).select('id').single()

  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'turma',
    resourceId: data.id, resourceLabel: payload.nome,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/turmas')
  redirect('/turmas')
}

export async function updateTurma(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await getSessionUser()
  const dias = formData.getAll('dias_semana') as DiaSemana[]

  const semestreRaw = formData.get('semestre') as string
  const idadeMinRaw = formData.get('idade_min') as string
  const idadeMaxRaw = formData.get('idade_max') as string

  const { data: before } = await supabase.from('turmas').select('*').eq('id', id).single()

  const payload = {
    nome:            formData.get('nome') as string,
    modalidade:      formData.get('modalidade') as TurmaModalidade,
    dias_semana:     dias,
    horario_inicio:  formData.get('horario_inicio') as string,
    horario_fim:     formData.get('horario_fim') as string,
    coach_id:        (formData.get('coach_id') as string) || null,
    capacidade:      Number(formData.get('capacidade')),
    status:          formData.get('status') as TurmaStatus,
    ano:             Number(formData.get('ano')) || null,
    semestre:        semestreRaw ? (Number(semestreRaw) as 1 | 2) : null,
    idade_min:       idadeMinRaw ? Number(idadeMinRaw) : null,
    idade_max:       idadeMaxRaw ? Number(idadeMaxRaw) : null,
    observacoes:     (formData.get('observacoes') as string) || null,
    captacao_aberta: formData.get('captacao_aberta') === 'true',
  }

  const { error } = await supabase.from('turmas').update(payload).eq('id', id)

  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'turma',
    resourceId: id, resourceLabel: payload.nome,
    before: before as Record<string, unknown>,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/turmas')
  redirect('/turmas')
}

export async function deleteTurma(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await getSessionUser()

  const { data: before } = await supabase.from('turmas').select('*').eq('id', id).single()

  const { error } = await supabase.from('turmas').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'turma',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/turmas')
  redirect('/turmas')
}
