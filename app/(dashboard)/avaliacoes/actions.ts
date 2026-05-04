'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'

export type EntradaCampo = { alunoId: string; value: number | null }

const CAMPOS_DERIVADOS = ['altura_cm', 'altura_ao_quadrado', 'imc', 'rce'] as const

const CAMPOS_PERMITIDOS = new Set([
  'massa_corporal', 'estatura', 'perimetro_cintura', 'envergadura',
  'estatura_sentado', 'sentar_alcancar', 'resistencia_6min',
  'forca_abdominal', 'arremesso_medicineball', 'agilidade',
  'salto_horizontal', 'corrida_20m', 'natacao_12min', 'observacoes',
])

async function recalcularDerived(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  alunoIds: string[],
  data: string,
) {
  const { data: rows } = await supabase
    .from('avaliacoes_fisicas')
    .select('aluno_id, massa_corporal, estatura, perimetro_cintura')
    .in('aluno_id', alunoIds)
    .eq('data', data)

  if (!rows?.length) return

  for (const row of rows) {
    const mc  = row.massa_corporal as number | null
    const est = row.estatura      as number | null
    const pc  = row.perimetro_cintura as number | null
    if (mc == null || est == null || est === 0) continue

    const altura_cm         = +(est * 100).toFixed(1)
    const altura_ao_quadrado = +(est * est).toFixed(6)
    const imc               = +(mc / (est * est)).toFixed(2)
    const rce               = pc != null ? +(pc / altura_cm).toFixed(4) : null

    await supabase
      .from('avaliacoes_fisicas')
      .update({ altura_cm, altura_ao_quadrado, imc, rce })
      .eq('aluno_id', row.aluno_id)
      .eq('data', data)
  }
}

export async function saveCampoParaTurma(
  turmaId: string,
  data: string,
  campo: string,
  entries: EntradaCampo[],
): Promise<{ error?: string }> {
  if (!CAMPOS_PERMITIDOS.has(campo)) return { error: 'Campo inválido.' }

  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // Upsert one row per aluno with just this field
  const rows = entries.map((e) => ({
    aluno_id:      e.alunoId,
    data,
    [campo]:       e.value,
    avaliador_id:  actor.id,
    updated_at:    new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('avaliacoes_fisicas')
    .upsert(rows, { onConflict: 'aluno_id,data' })

  if (error) return { error: error.message }

  // Recalculate IMC / RCE / etc. when relevant measurement changes
  if (['massa_corporal', 'estatura', 'perimetro_cintura'].includes(campo)) {
    await recalcularDerived(supabase, entries.map((e) => e.alunoId), data)
  }

  revalidatePath(`/avaliacoes/${turmaId}/${data}`)
  return {}
}
