'use server'

import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type TurmaPayload = { turma_id: string; descricao: string }

async function getRole(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role ?? ''
}

export async function criarRegistroAula(payload: {
  data: string
  modalidade: string
  objetivo: string
  observacoes: string
  turmas: TurmaPayload[]
  targetCoachId?: string
}): Promise<string> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const role = await getRole(supabase, actor.id)
  const coachId = (payload.targetCoachId && role === 'admin') ? payload.targetCoachId : actor.id

  const { data: registro, error } = await supabase
    .from('registros_aula')
    .insert({
      coach_id:   coachId,
      data:       payload.data,
      modalidade: payload.modalidade,
      objetivo:   payload.objetivo  || null,
      observacoes: payload.observacoes || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (payload.turmas.length > 0) {
    const { error: tErr } = await supabase
      .from('registro_aula_turmas')
      .insert(payload.turmas.map((t) => ({
        registro_aula_id: registro.id,
        turma_id:         t.turma_id,
        descricao:        t.descricao || null,
      })))
    if (tErr) throw new Error(tErr.message)
  }

  revalidatePath('/diario')
  return registro.id
}

export async function atualizarRegistroAula(
  registroId: string,
  payload: {
    data: string
    modalidade: string
    objetivo: string
    observacoes: string
    turmas: TurmaPayload[]
  }
): Promise<void> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: existing } = await supabase
    .from('registros_aula').select('coach_id').eq('id', registroId).single()

  if (!existing) throw new Error('Registro não encontrado')

  const role = await getRole(supabase, actor.id)
  if (existing.coach_id !== actor.id && role !== 'admin') throw new Error('Acesso negado')

  const { error } = await supabase
    .from('registros_aula')
    .update({
      data:        payload.data,
      modalidade:  payload.modalidade,
      objetivo:    payload.objetivo    || null,
      observacoes: payload.observacoes || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', registroId)

  if (error) throw new Error(error.message)

  // Replace turma entries
  await supabase.from('registro_aula_turmas').delete().eq('registro_aula_id', registroId)

  if (payload.turmas.length > 0) {
    await supabase.from('registro_aula_turmas').insert(
      payload.turmas.map((t) => ({
        registro_aula_id: registroId,
        turma_id:         t.turma_id,
        descricao:        t.descricao || null,
      }))
    )
  }

  revalidatePath('/diario')
  revalidatePath(`/diario/${registroId}/editar`)
}

export async function criarMultiplosRegistros(
  entries: Array<{
    data: string
    modalidade: string
    objetivo: string
    descricao: string
    observacoes: string
    turmaIds: string[]
  }>,
  targetCoachId?: string
): Promise<void> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const role = await getRole(supabase, actor.id)
  const coachId = (targetCoachId && role === 'admin') ? targetCoachId : actor.id

  for (const entry of entries) {
    if (!entry.data || entry.turmaIds.length === 0) continue

    const { data: registro, error } = await supabase
      .from('registros_aula')
      .upsert(
        {
          coach_id:    coachId,
          data:        entry.data,
          modalidade:  entry.modalidade || 'corrida',
          objetivo:    entry.objetivo    || null,
          descricao:   entry.descricao   || null,
          observacoes: entry.observacoes || null,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'coach_id,data' }
      )
      .select('id')
      .single()

    if (error || !registro) continue

    // Replace turma entries
    await supabase.from('registro_aula_turmas').delete().eq('registro_aula_id', registro.id)
    await supabase.from('registro_aula_turmas').insert(
      entry.turmaIds.map((tid) => ({
        registro_aula_id: registro.id,
        turma_id:         tid,
        descricao:        null,
      }))
    )
  }

  revalidatePath('/diario')
}

export async function excluirRegistroAula(registroId: string): Promise<void> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: existing } = await supabase
    .from('registros_aula').select('coach_id').eq('id', registroId).single()

  if (!existing) throw new Error('Registro não encontrado')

  const role = await getRole(supabase, actor.id)
  if (existing.coach_id !== actor.id && role !== 'admin') throw new Error('Acesso negado')

  await supabase.from('registros_aula').delete().eq('id', registroId)
  revalidatePath('/diario')
}
