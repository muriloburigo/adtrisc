'use server'

import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { friendlyError } from '@/lib/errors'
import { logAudit } from '@/lib/audit'

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

  if (error || !registro) throw new Error(error?.message ?? 'Erro ao criar registro.')

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

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'diario',
    resourceId: registro.id, resourceLabel: `Diário ${payload.data} — ${payload.modalidade}`,
    after: { coach_id: coachId, data: payload.data, modalidade: payload.modalidade },
  })

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

  const { data: updated, error } = await supabase
    .from('registros_aula')
    .update({
      data:        payload.data,
      modalidade:  payload.modalidade,
      objetivo:    payload.objetivo    || null,
      observacoes: payload.observacoes || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', registroId)
    .select('id')
    .single()

  if (error || !updated) throw new Error(error?.message ?? 'Erro ao salvar registro.')

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

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'diario',
    resourceId: registroId, resourceLabel: `Diário ${payload.data} — ${payload.modalidade}`,
    after: { data: payload.data, modalidade: payload.modalidade },
  })

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
): Promise<{ error?: string } | void> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const role = await getRole(supabase, actor.id)
  const coachId = (targetCoachId && role === 'admin') ? targetCoachId : actor.id

  let lastError: unknown = null
  let salvos = 0

  for (const entry of entries) {
    if (!entry.data) continue

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

    // Não interrompe o loop num dia com erro — ainda tenta salvar os
    // demais dias do batch — mas guarda pra reportar no fim em vez de
    // engolir a falha em silêncio.
    if (error || !registro) { lastError = error; continue }
    salvos++

    // Replace turma entries — dia sem nenhuma turma marcada (ex: feriado) ainda
    // salva o registro, só fica sem vínculo de turma nenhuma.
    await supabase.from('registro_aula_turmas').delete().eq('registro_aula_id', registro.id)
    if (entry.turmaIds.length > 0) {
      await supabase.from('registro_aula_turmas').insert(
        entry.turmaIds.map((tid) => ({
          registro_aula_id: registro.id,
          turma_id:         tid,
          descricao:        null,
        }))
      )
    }
  }

  if (salvos > 0) {
    await logAudit({
      userId: actor.id, userName: actor.name,
      action: 'criar', resource: 'diario',
      resourceId: coachId, resourceLabel: `Diário em lote (${salvos} dia${salvos > 1 ? 's' : ''})`,
      after: { coach_id: coachId, quantidade: salvos },
    })
  }

  if (lastError) return { error: friendlyError(lastError, 'Alguns dias não foram salvos.') }

  revalidatePath('/diario')
}

export async function salvarResumoDiario(
  ano: number,
  mes: number,
  payload: { cidade: string; processo: string; resumo: string },
  targetCoachId?: string
): Promise<void> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const role = await getRole(supabase, actor.id)
  const coachId = (targetCoachId && role === 'admin') ? targetCoachId : actor.id

  const { error } = await supabase
    .from('diario_resumos')
    .upsert(
      {
        coach_id:   coachId,
        ano,
        mes,
        cidade:     payload.cidade   || null,
        processo:   payload.processo || null,
        resumo:     payload.resumo   || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'coach_id,ano,mes' }
    )

  if (error) throw new Error(error.message)

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

  const { data: deleted, error } = await supabase
    .from('registros_aula').delete().eq('id', registroId).select('*').single()
  if (error || !deleted) throw new Error(error?.message ?? 'Erro ao excluir registro.')

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'diario',
    resourceId: registroId, resourceLabel: `Diário ${deleted.data} — ${deleted.modalidade}`,
    before: deleted as Record<string, unknown>,
  })

  revalidatePath('/diario')
}
