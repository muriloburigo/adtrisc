'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { mmssToSeconds } from '@/lib/utils'
import type { EtapaProva } from '@/types/database'

type CategoriaInput = {
  nome: string
  idade_min: number | null
  idade_max: number | null
  etapas: EtapaProva[]
}

export async function createProva(formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const nome = (formData.get('nome') as string)?.trim()
  const local = (formData.get('local') as string)?.trim()
  const data = formData.get('data') as string
  const observacoes = (formData.get('observacoes') as string)?.trim() || null

  let categorias: CategoriaInput[] = []
  try {
    categorias = JSON.parse((formData.get('categorias_json') as string) || '[]')
  } catch {
    return { error: 'Categorias inválidas.' }
  }

  const payload = { nome, local, data, observacoes, criado_por: actor.id }

  const { data: prova, error } = await supabase
    .from('provas').insert(payload).select('id').single()

  if (error || !prova) return { error: friendlyError(error, 'Erro ao criar prova.') }

  if (categorias.length > 0) {
    const { error: catError } = await supabase.from('prova_categorias').insert(
      categorias.map((c, i) => ({
        prova_id: prova.id,
        nome: c.nome,
        idade_min: c.idade_min,
        idade_max: c.idade_max,
        etapas: c.etapas,
        ordem: i,
      })),
    )
    if (catError) return { error: friendlyError(catError, 'Prova criada, mas houve erro ao salvar as categorias.') }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'prova',
    resourceId: prova.id, resourceLabel: nome,
    after: { ...payload, categorias } as Record<string, unknown>,
  })

  revalidatePath('/provas')
  redirect(`/provas/${prova.id}`)
}

export async function updateProva(id: string, formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await supabase.from('provas').select('*').eq('id', id).single()

  const payload = {
    nome: (formData.get('nome') as string)?.trim(),
    local: (formData.get('local') as string)?.trim(),
    data: formData.get('data') as string,
    observacoes: (formData.get('observacoes') as string)?.trim() || null,
  }

  const { data: updated, error } = await supabase
    .from('provas').update(payload).eq('id', id).select('id').single()

  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar alterações.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'prova',
    resourceId: id, resourceLabel: payload.nome,
    before: before as Record<string, unknown>,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/provas')
  revalidatePath(`/provas/${id}`)
  redirect(`/provas/${id}`)
}

export async function deleteProva(id: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await supabase.from('provas').select('*').eq('id', id).single()

  const { data: deleted, error } = await supabase
    .from('provas').delete().eq('id', id).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir prova.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'prova',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/provas')
  redirect('/provas')
}

export async function addCategoria(
  provaId: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  let etapas: EtapaProva[] = []
  try {
    etapas = JSON.parse((formData.get('etapas_json') as string) || '[]')
  } catch {
    return { error: 'Etapas inválidas.' }
  }

  const idadeMinRaw = formData.get('idade_min') as string
  const idadeMaxRaw = formData.get('idade_max') as string

  const { count } = await supabase
    .from('prova_categorias').select('id', { count: 'exact', head: true }).eq('prova_id', provaId)

  const payload = {
    prova_id: provaId,
    nome: (formData.get('nome') as string)?.trim(),
    idade_min: idadeMinRaw ? Number(idadeMinRaw) : null,
    idade_max: idadeMaxRaw ? Number(idadeMaxRaw) : null,
    etapas,
    ordem: count ?? 0,
  }

  const { data: categoria, error } = await supabase
    .from('prova_categorias').insert(payload).select('id').single()
  if (error || !categoria) return { error: friendlyError(error, 'Erro ao adicionar categoria.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'prova',
    resourceId: provaId, resourceLabel: `Categoria ${payload.nome}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/provas/${provaId}`)
}

export async function updateCategoria(
  categoriaId: string,
  provaId: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  let etapas: EtapaProva[] = []
  try {
    etapas = JSON.parse((formData.get('etapas_json') as string) || '[]')
  } catch {
    return { error: 'Etapas inválidas.' }
  }

  const idadeMinRaw = formData.get('idade_min') as string
  const idadeMaxRaw = formData.get('idade_max') as string

  const payload = {
    nome: (formData.get('nome') as string)?.trim(),
    idade_min: idadeMinRaw ? Number(idadeMinRaw) : null,
    idade_max: idadeMaxRaw ? Number(idadeMaxRaw) : null,
    etapas,
  }

  const { data: updated, error } = await supabase
    .from('prova_categorias').update(payload).eq('id', categoriaId).select('id').single()
  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar categoria.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'prova',
    resourceId: provaId, resourceLabel: `Categoria ${payload.nome}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/provas/${provaId}`)
}

export async function deleteCategoria(
  categoriaId: string,
  provaId: string,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await supabase
    .from('prova_categorias').select('*').eq('id', categoriaId).single()

  const { data: deleted, error } = await supabase
    .from('prova_categorias').delete().eq('id', categoriaId).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir categoria.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'prova',
    resourceId: provaId, resourceLabel: `Categoria ${before?.nome ?? ''}`,
    before: before as Record<string, unknown>,
  })

  revalidatePath(`/provas/${provaId}`)
}

export async function saveResultado(formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const provaId = formData.get('prova_id') as string
  const alunoId = formData.get('aluno_id') as string
  const alunoNome = (formData.get('aluno_nome') as string) || null
  const tempoRaw = (formData.get('tempo_total') as string)?.trim()
  const colocGeralRaw = formData.get('colocacao_geral') as string
  const colocCatRaw = formData.get('colocacao_categoria') as string

  const tempoSegundos = tempoRaw ? mmssToSeconds(tempoRaw) : null
  if (tempoRaw && tempoSegundos === null) {
    return { error: 'Tempo inválido. Use o formato MM:SS (ex: 45:32).' }
  }

  const payload = {
    prova_id: provaId,
    categoria_id: formData.get('categoria_id') as string,
    aluno_id: alunoId,
    tempo_total_segundos: tempoSegundos,
    colocacao_geral: colocGeralRaw ? Number(colocGeralRaw) : null,
    colocacao_categoria: colocCatRaw ? Number(colocCatRaw) : null,
  }

  const { data: resultado, error } = await supabase
    .from('resultados_prova')
    .upsert(payload, { onConflict: 'prova_id,aluno_id' })
    .select('id')
    .single()

  if (error || !resultado) return { error: friendlyError(error, 'Erro ao salvar resultado.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'prova',
    resourceId: provaId, resourceLabel: `Resultado de ${alunoNome ?? alunoId}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/provas/${provaId}`)
}

export async function deleteResultado(id: string, provaId: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await supabase.from('resultados_prova').select('*').eq('id', id).single()

  const { data: deleted, error } = await supabase
    .from('resultados_prova').delete().eq('id', id).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir resultado.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'prova',
    resourceId: provaId, resourceLabel: 'Resultado',
    before: before as Record<string, unknown>,
  })

  revalidatePath(`/provas/${provaId}`)
}
