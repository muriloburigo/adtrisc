'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'

export type AvaliacaoPayload = {
  data: string
  massa_corporal: number | null
  estatura: number | null
  perimetro_cintura: number | null
  envergadura: number | null
  estatura_sentado: number | null
  altura_cm: number | null
  altura_ao_quadrado: number | null
  imc: number | null
  rce: number | null
  sentar_alcancar: number | null
  resistencia_6min: number | null
  forca_abdominal: number | null
  arremesso_medicineball: number | null
  agilidade: number | null
  salto_horizontal: number | null
  corrida_20m: number | null
  natacao_12min: number | null
  observacoes: string | null
}

export async function createAvaliacaoFisica(
  alunoId: string,
  payload: AvaliacaoPayload,
): Promise<{ error?: string }> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { error } = await supabase.from('avaliacoes_fisicas').upsert({
    aluno_id: alunoId,
    avaliador_id: actor.id,
    ...payload,
  }, { onConflict: 'aluno_id,data' })

  if (error) return { error: error.message }

  revalidatePath(`/alunos/${alunoId}/avaliacoes`)
  return {}
}

export async function deleteAvaliacao(
  alunoId: string,
  avaliacaoId: string,
): Promise<{ error?: string }> {
  await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { error } = await supabase
    .from('avaliacoes_fisicas')
    .delete()
    .eq('id', avaliacaoId)
    .eq('aluno_id', alunoId)

  if (error) return { error: error.message }
  revalidatePath(`/alunos/${alunoId}/avaliacoes`)
  return {}
}
