'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { mmssToSeconds } from '@/lib/utils'

// Campos medidos em cm no formulário, mas guardados em metros no banco
// (mesma escala de "estatura", já usada assim antes desta correção).
const CAMPOS_CM_PARA_M = new Set(['estatura', 'envergadura', 'estatura_sentado'])

// Campos numéricos que a grade por turma pode gravar (tempos já chegam em segundos).
const CAMPOS_EDITAVEIS = new Set([
  'massa_corporal', 'estatura', 'envergadura', 'estatura_sentado', 'altura_banco', 'perimetro_cintura',
  'sentar_alcancar', 'resistencia_6min', 'forca_abdominal', 'arremesso_medicineball', 'agilidade',
  'salto_horizontal', 'corrida_20m', 'natacao_12min', 'resistencia_5min_dabonneville',
  'ciclismo_2km_tempo', 'natacao_50m', 'natacao_100m',
])

// Testes de campo que podem ser registrados avulsos, fora da avaliação da turma.
export type TipoTeste = 'dabonneville' | 'ciclismo_2km' | 'natacao_50m' | 'natacao_100m'
const CAMPO_DO_TESTE: Record<TipoTeste, string> = {
  dabonneville: 'resistencia_5min_dabonneville',
  ciclismo_2km: 'ciclismo_2km_tempo',
  natacao_50m:  'natacao_50m',
  natacao_100m: 'natacao_100m',
}

type Linha = Record<string, unknown>

// IMC, RCE e velocidade do ciclismo, recalculados sempre a partir da linha completa.
// (Maturação não é guardada aqui: depende de sexo/nascimento do aluno e é
// calculada na exibição por lib/maturacao.ts.)
function calcularDerivados(l: Linha) {
  const massa = l.massa_corporal as number | null
  const estaturaM = l.estatura as number | null
  const perimetro = l.perimetro_cintura as number | null
  const ciclismo = l.ciclismo_2km_tempo as number | null
  const altura_cm = estaturaM ? Math.round(estaturaM * 100 * 10) / 10 : null
  return {
    altura_cm,
    altura_ao_quadrado: estaturaM ? Math.round(estaturaM * estaturaM * 1_000_000) / 1_000_000 : null,
    imc: massa && estaturaM ? Math.round((massa / (estaturaM * estaturaM)) * 100) / 100 : null,
    rce: perimetro && altura_cm ? Math.round((perimetro / altura_cm) * 10_000) / 10_000 : null,
    ciclismo_2km_velocidade: ciclismo ? Math.round((2 / (ciclismo / 3600)) * 100) / 100 : null,
  }
}

// Grava `patch` na avaliação do aluno naquela data (uma linha por aluno+data),
// criando a linha se ainda não existir.
async function upsertPorData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any, avaliadorId: string, alunoId: string, data: string, patch: Linha,
): Promise<{ error?: string; before?: Linha | null }> {
  const { data: existing } = await db
    .from('avaliacoes_fisicas')
    .select('*')
    .eq('aluno_id', alunoId)
    .eq('data', data)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    const update = { ...patch, ...calcularDerivados({ ...existing, ...patch }) }
    const { data: updated, error } = await db
      .from('avaliacoes_fisicas').update(update).eq('id', existing.id).select('id').single()
    if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar.') }
    return { before: existing }
  }
  const insert = { aluno_id: alunoId, avaliador_id: avaliadorId, data, ...patch, ...calcularDerivados(patch) }
  const { error } = await db.from('avaliacoes_fisicas').insert(insert)
  if (error) return { error: friendlyError(error, 'Erro ao salvar.') }
  return { before: null }
}

export async function saveAvaliacao(formData: FormData): Promise<{ id?: string; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const alunoId = formData.get('aluno_id') as string
  const alunoNome = formData.get('aluno_nome') as string
  const num = (k: string) => parseFloat(formData.get(k) as string) || null
  const int = (k: string) => parseInt(formData.get(k) as string) || null
  const tempo = (k: string) => mmssToSeconds((formData.get(k) as string) ?? '')
  const cmParaM = (k: string) => { const v = num(k); return v ? v / 100 : null }

  const campos: Linha = {
    massa_corporal:         num('massa_corporal'),
    estatura:               cmParaM('estatura'),
    envergadura:            cmParaM('envergadura'),
    estatura_sentado:       cmParaM('estatura_sentado'),
    altura_banco:           num('altura_banco'),
    perimetro_cintura:      num('perimetro_cintura'),
    sentar_alcancar:        num('sentar_alcancar'),
    resistencia_6min:       int('resistencia_6min'),
    forca_abdominal:        int('forca_abdominal'),
    arremesso_medicineball: num('arremesso_medicineball'),
    agilidade:              num('agilidade'),
    salto_horizontal:       num('salto_horizontal'),
    corrida_20m:            num('corrida_20m'),
    natacao_12min:          int('natacao_12min'),
    resistencia_5min_dabonneville: int('resistencia_5min_dabonneville'),
    ciclismo_2km_tempo:     tempo('ciclismo_2km_tempo'),
    natacao_50m:            tempo('natacao_50m'),
    natacao_100m:           tempo('natacao_100m'),
    atividade_url:          (formData.get('atividade_url') as string)?.trim() || null,
    observacoes:            (formData.get('observacoes') as string)?.trim() || null,
  }
  const payload = {
    aluno_id:     alunoId,
    avaliador_id: actor.id,
    data:         formData.get('data') as string,
    ...campos,
    ...calcularDerivados(campos),
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

  if (!CAMPOS_EDITAVEIS.has(field)) return { error: 'Campo inválido.' }

  let numValue = value === '' ? null : parseFloat(value)
  if (numValue !== null && Number.isNaN(numValue)) return { error: 'Valor inválido.' }
  if (numValue !== null && CAMPOS_CM_PARA_M.has(field)) numValue = numValue / 100

  const res = await upsertPorData(db, actor.id, alunoId, data, { [field]: numValue })
  if (res.error) return { error: res.error }

  revalidatePath('/avaliacoes')
  revalidatePath(`/alunos/${alunoId}`)
}

// Link da atividade (Garmin, Polar, Strava) da avaliação do aluno naquela data.
// Vazio apaga o link.
export async function saveAtividadeUrl(
  alunoId: string,
  data: string,
  url: string,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: 'Data inválida.' }
  const link = url.trim() || null
  if (link) {
    let parsed: URL
    try { parsed = new URL(link) } catch { return { error: 'Link inválido. Cole o endereço completo (https://…).' } }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { error: 'Link inválido. Cole o endereço completo (https://…).' }
    }
  } else {
    // Apagar o link não deve criar uma avaliação vazia.
    const { data: existing } = await db.from('avaliacoes_fisicas').select('id')
      .eq('aluno_id', alunoId).eq('data', data).is('deleted_at', null).maybeSingle()
    if (!existing) return
  }

  const res = await upsertPorData(db, actor.id, alunoId, data, { atividade_url: link })
  if (res.error) return { error: res.error }
  if ((res.before?.atividade_url ?? null) === link) return

  const { data: aluno } = await db.from('alunos').select('nome').eq('id', alunoId).single()
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: res.before ? 'editar' : 'criar', resource: 'atleta',
    resourceId: alunoId, resourceLabel: `Link da atividade de ${aluno?.nome ?? ''} — ${data}`,
    before: res.before ? { atividade_url: res.before.atividade_url } : null,
    after: { atividade_url: link },
  })

  revalidatePath('/avaliacoes')
  revalidatePath(`/alunos/${alunoId}`)
}

// Registra um teste de campo avulso (ex.: Dabonneville refeito no meio do
// semestre) direto na página do atleta, sem abrir avaliação para a turma.
// `valor`: metros (dabonneville) ou tempo "MM:SS(.cc)" (ciclismo e natação).
export async function registrarTeste(
  alunoId: string,
  data: string,
  tipo: TipoTeste,
  valor: string,
  atividadeUrl?: string,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const campo = CAMPO_DO_TESTE[tipo]
  if (!campo) return { error: 'Tipo de teste inválido.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: 'Data inválida.' }

  const resultado = tipo === 'dabonneville' ? parseInt(valor) : mmssToSeconds(valor)
  if (!resultado || resultado <= 0) {
    return { error: tipo === 'dabonneville' ? 'Informe a distância em metros.' : 'Informe o tempo no formato MM:SS ou MM:SS.cc.' }
  }

  const patch: Linha = { [campo]: resultado }
  if (atividadeUrl?.trim()) patch.atividade_url = atividadeUrl.trim()

  const res = await upsertPorData(db, actor.id, alunoId, data, patch)
  if (res.error) return { error: res.error }

  const { data: aluno } = await db.from('alunos').select('nome').eq('id', alunoId).single()
  await logAudit({
    userId: actor.id, userName: actor.name,
    action: res.before ? 'editar' : 'criar', resource: 'atleta',
    resourceId: alunoId, resourceLabel: `Teste (${tipo}) de ${aluno?.nome ?? ''} — ${data}`,
    before: res.before ? { [campo]: res.before[campo] } : null,
    after: patch,
  })

  revalidatePath(`/alunos/${alunoId}`)
  revalidatePath('/avaliacoes')
}

export async function deleteAvaliacao(id: string, alunoId: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const [{ data: aluno }, { data: updated, error }] = await Promise.all([
    db.from('alunos').select('nome').eq('id', alunoId).single(),
    db.from('avaliacoes_fisicas').update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id, data').single(),
  ])
  if (error || !updated) return { error: friendlyError(error, 'Erro ao excluir avaliação.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'atleta',
    resourceId: alunoId,
    resourceLabel: `Avaliação ${aluno?.nome ?? ''} — ${updated.data}`,
  })

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
