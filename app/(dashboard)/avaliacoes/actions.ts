'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'

// Campos medidos em cm no formulário, mas guardados em metros no banco
// (mesma escala de "estatura", já usada assim antes desta correção).
const CAMPOS_CM_PARA_M = new Set(['estatura', 'envergadura', 'estatura_sentado'])

function calcularDerivados(massaCorporal: number | null, estaturaM: number | null, perimetroCintura: number | null) {
  const altura_cm = estaturaM ? Math.round(estaturaM * 100 * 10) / 10 : null
  const altura_ao_quadrado = estaturaM ? Math.round(estaturaM * estaturaM * 1_000_000) / 1_000_000 : null
  const imc = massaCorporal && estaturaM
    ? Math.round((massaCorporal / (estaturaM * estaturaM)) * 100) / 100
    : null
  const rce = perimetroCintura && altura_cm
    ? Math.round((perimetroCintura / altura_cm) * 10_000) / 10_000
    : null
  return { altura_cm, altura_ao_quadrado, imc, rce }
}

export async function saveAvaliacao(formData: FormData): Promise<{ id?: string; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const alunoId = formData.get('aluno_id') as string
  const alunoNome = formData.get('aluno_nome') as string

  const massaCorporal   = parseFloat(formData.get('massa_corporal') as string) || null
  const estaturaCm      = parseFloat(formData.get('estatura') as string) || null
  const envergaduraCm   = parseFloat(formData.get('envergadura') as string) || null
  const estaturaSentCm  = parseFloat(formData.get('estatura_sentado') as string) || null
  const perimetro       = parseFloat(formData.get('perimetro_cintura') as string) || null

  const estatura = estaturaCm ? estaturaCm / 100 : null
  const derivados = calcularDerivados(massaCorporal, estatura, perimetro)

  const payload = {
    aluno_id:               alunoId,
    avaliador_id:           actor.id,
    data:                   formData.get('data') as string,
    massa_corporal:         massaCorporal,
    estatura,
    envergadura:            envergaduraCm ? envergaduraCm / 100 : null,
    estatura_sentado:       estaturaSentCm ? estaturaSentCm / 100 : null,
    perimetro_cintura:      perimetro,
    ...derivados,
    sentar_alcancar:        parseFloat(formData.get('sentar_alcancar') as string) || null,
    resistencia_6min:       parseInt(formData.get('resistencia_6min') as string) || null,
    forca_abdominal:        parseInt(formData.get('forca_abdominal') as string) || null,
    arremesso_medicineball: parseFloat(formData.get('arremesso_medicineball') as string) || null,
    agilidade:              parseFloat(formData.get('agilidade') as string) || null,
    salto_horizontal:       parseFloat(formData.get('salto_horizontal') as string) || null,
    corrida_20m:            parseFloat(formData.get('corrida_20m') as string) || null,
    natacao_12min:          parseInt(formData.get('natacao_12min') as string) || null,
    observacoes:            (formData.get('observacoes') as string)?.trim() || null,
  }

  const { data: result, error } = await db
    .from('avaliacoes_fisicas').insert(payload).select('id').single()

  if (error || !result) return { error: friendlyError(error, 'Erro ao salvar avaliação.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'atleta',
    resourceId: alunoId, resourceLabel: `Avaliação de ${alunoNome}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/alunos/${alunoId}`)
  revalidatePath('/avaliacoes')

  return { id: result.id as string }
}

export async function saveAvaliacaoField(
  alunoId: string,
  data: string,
  field: string,
  value: string,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  let numValue = value === '' ? null : parseFloat(value)
  if (numValue !== null && CAMPOS_CM_PARA_M.has(field)) numValue = numValue / 100

  // Check if record exists for this aluno+data (ignore soft-deleted)
  const { data: existing } = await db
    .from('avaliacoes_fisicas')
    .select('id, massa_corporal, estatura, perimetro_cintura')
    .eq('aluno_id', alunoId)
    .eq('data', data)
    .is('deleted_at', null)
    .single()

  if (existing) {
    const update: Record<string, unknown> = { [field]: numValue }
    const massa     = field === 'massa_corporal'    ? numValue : existing.massa_corporal
    const estatura  = field === 'estatura'          ? numValue : existing.estatura
    const perimetro = field === 'perimetro_cintura' ? numValue : existing.perimetro_cintura
    Object.assign(update, calcularDerivados(massa, estatura, perimetro))
    const { data: updated, error } = await db
      .from('avaliacoes_fisicas').update(update).eq('id', existing.id).select('id').single()
    if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar.') }
  } else {
    const insert: Record<string, unknown> = {
      aluno_id: alunoId,
      avaliador_id: actor.id,
      data,
      [field]: numValue,
      ...calcularDerivados(
        field === 'massa_corporal' ? numValue : null,
        field === 'estatura' ? numValue : null,
        field === 'perimetro_cintura' ? numValue : null,
      ),
    }
    const { error } = await db.from('avaliacoes_fisicas').insert(insert)
    if (error) return { error: friendlyError(error, 'Erro ao salvar.') }
  }

  revalidatePath('/avaliacoes')
}

export async function deleteAvaliacao(id: string, alunoId: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  await requireStaff()
  const { data: updated, error } = await db
    .from('avaliacoes_fisicas').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single()
  if (error || !updated) return { error: friendlyError(error, 'Erro ao excluir avaliação.') }
  revalidatePath(`/alunos/${alunoId}`)
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

  if (error) return { error: friendlyError(error, 'Erro ao excluir avaliações.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'atleta',
    resourceId: turmaId,
    resourceLabel: `Avaliação ${turmaNome} — ${data}`,
  })

  revalidatePath('/avaliacoes')
}
