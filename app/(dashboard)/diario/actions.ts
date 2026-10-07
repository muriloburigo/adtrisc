'use server'

import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { friendlyError } from '@/lib/errors'
import { logAudit } from '@/lib/audit'
import { getTurmasDoCoach } from '@/lib/turmas'

// Diário de Aulas: cada registro é UMA aula (data + modalidade + turmas + textos).
// Um dia pode ter várias aulas (ex.: natação de manhã e corrida à tarde).

export type AulaPayload = {
  data: string
  modalidade: string
  objetivo: string
  descricao: string
  observacoes: string
  turmaIds: string[]
}

const MODALIDADES = ['corrida', 'ciclismo', 'natacao', 'triathlon', 'duathlon', 'reuniao']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any

async function getRole(supabase: Db, userId: string): Promise<string> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role ?? ''
}

/** Valida o payload e mantém só turmas do treinador dono do diário (titular ou auxiliar). */
async function validar(supabase: Db, coachId: string, p: AulaPayload): Promise<{ error?: string; turmaIds?: string[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data)) return { error: 'Data inválida.' }
  if (!MODALIDADES.includes(p.modalidade)) return { error: 'Escolha a modalidade.' }
  const doCoach = new Set((await getTurmasDoCoach(supabase, coachId)).map((t) => t.id))
  return { turmaIds: [...new Set(p.turmaIds)].filter((id) => doCoach.has(id)) }
}

async function gravarTurmas(supabase: Db, registroId: string, turmaIds: string[]) {
  await supabase.from('registro_aula_turmas').delete().eq('registro_aula_id', registroId)
  if (turmaIds.length) {
    const { error } = await supabase.from('registro_aula_turmas')
      .insert(turmaIds.map((turma_id) => ({ registro_aula_id: registroId, turma_id, descricao: null })))
    if (error) return friendlyError(error, 'Erro ao salvar as turmas.')
  }
  return null
}

const rotulo = (p: { data: string; modalidade: string }) => `Diário ${p.data} — ${p.modalidade}`

export async function criarRegistroAula(payload: AulaPayload, targetCoachId?: string): Promise<{ error?: string; id?: string }> {
  const actor = await requireStaff()
  const supabase = (await createClient()) as Db
  const role = await getRole(supabase, actor.id)
  const coachId = targetCoachId && role === 'admin' ? targetCoachId : actor.id

  const v = await validar(supabase, coachId, payload)
  if (v.error) return { error: v.error }

  const { data: registro, error } = await supabase
    .from('registros_aula')
    .insert({
      coach_id:    coachId,
      data:        payload.data,
      modalidade:  payload.modalidade,
      objetivo:    payload.objetivo.trim()    || null,
      descricao:   payload.descricao.trim()   || null,
      observacoes: payload.observacoes.trim() || null,
    })
    .select('id')
    .single()
  if (error || !registro) return { error: friendlyError(error, 'Erro ao criar a aula.') }

  const erroTurmas = await gravarTurmas(supabase, registro.id, v.turmaIds!)
  if (erroTurmas) return { error: erroTurmas }

  await logAudit({
    userId: actor.id, userName: actor.name, action: 'criar', resource: 'diario',
    resourceId: registro.id, resourceLabel: rotulo(payload),
    after: { coach_id: coachId, data: payload.data, modalidade: payload.modalidade, turmas: v.turmaIds!.length },
  })
  revalidatePath('/diario', 'layout')
  return { id: registro.id }
}

export async function atualizarRegistroAula(registroId: string, payload: AulaPayload): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const supabase = (await createClient()) as Db

  const { data: existing } = await supabase
    .from('registros_aula').select('coach_id, data, modalidade').eq('id', registroId).maybeSingle()
  if (!existing) return { error: 'Aula não encontrada.' }
  const role = await getRole(supabase, actor.id)
  if (existing.coach_id !== actor.id && role !== 'admin') return { error: 'Acesso negado.' }

  const v = await validar(supabase, existing.coach_id, payload)
  if (v.error) return { error: v.error }

  const { error } = await supabase
    .from('registros_aula')
    .update({
      data:        payload.data,
      modalidade:  payload.modalidade,
      objetivo:    payload.objetivo.trim()    || null,
      descricao:   payload.descricao.trim()   || null,
      observacoes: payload.observacoes.trim() || null,
      updated_at:  new Date().toISOString(),
    })
    .eq('id', registroId)
  if (error) return { error: friendlyError(error, 'Erro ao salvar a aula.') }

  const erroTurmas = await gravarTurmas(supabase, registroId, v.turmaIds!)
  if (erroTurmas) return { error: erroTurmas }

  await logAudit({
    userId: actor.id, userName: actor.name, action: 'editar', resource: 'diario',
    resourceId: registroId, resourceLabel: rotulo(payload),
    before: { data: existing.data, modalidade: existing.modalidade },
    after: { data: payload.data, modalidade: payload.modalidade, turmas: v.turmaIds!.length },
  })
  revalidatePath('/diario', 'layout')
  return {}
}

export async function excluirRegistroAula(registroId: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const supabase = (await createClient()) as Db

  const { data: existing } = await supabase
    .from('registros_aula').select('coach_id').eq('id', registroId).maybeSingle()
  if (!existing) return { error: 'Aula não encontrada.' }
  const role = await getRole(supabase, actor.id)
  if (existing.coach_id !== actor.id && role !== 'admin') return { error: 'Acesso negado.' }

  const { data: deleted, error } = await supabase
    .from('registros_aula').delete().eq('id', registroId).select('*').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir a aula.') }

  await logAudit({
    userId: actor.id, userName: actor.name, action: 'excluir', resource: 'diario',
    resourceId: registroId, resourceLabel: rotulo(deleted),
    before: deleted as Record<string, unknown>,
  })
  revalidatePath('/diario', 'layout')
  return {}
}

export async function salvarResumoDiario(
  ano: number,
  mes: number,
  payload: { cidade: string; processo: string; resumo: string },
  targetCoachId?: string
): Promise<void> {
  const actor = await requireStaff()
  const supabase = (await createClient()) as Db

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
