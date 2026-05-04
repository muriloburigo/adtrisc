'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { DiaSemana, TurmaModalidade, TurmaStatus } from '@/types/database'

export async function createTurma(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const dias = formData.getAll('dias_semana') as DiaSemana[]

  const { error } = await supabase.from('turmas').insert({
    nome:           formData.get('nome') as string,
    modalidade:     formData.get('modalidade') as TurmaModalidade,
    dias_semana:    dias,
    horario_inicio: formData.get('horario_inicio') as string,
    horario_fim:    formData.get('horario_fim') as string,
    coach_id:       (formData.get('coach_id') as string) || null,
    capacidade:     Number(formData.get('capacidade')),
    observacoes:    (formData.get('observacoes') as string) || null,
    status:         'ativa' as TurmaStatus,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/turmas')
  redirect('/turmas')
}

export async function updateTurma(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const dias = formData.getAll('dias_semana') as DiaSemana[]

  const { error } = await supabase.from('turmas').update({
    nome:           formData.get('nome') as string,
    modalidade:     formData.get('modalidade') as TurmaModalidade,
    dias_semana:    dias,
    horario_inicio: formData.get('horario_inicio') as string,
    horario_fim:    formData.get('horario_fim') as string,
    coach_id:       (formData.get('coach_id') as string) || null,
    capacidade:     Number(formData.get('capacidade')),
    status:         formData.get('status') as TurmaStatus,
    observacoes:    (formData.get('observacoes') as string) || null,
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/turmas')
  redirect('/turmas')
}

export async function deleteTurma(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { error } = await supabase.from('turmas').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/turmas')
  redirect('/turmas')
}
