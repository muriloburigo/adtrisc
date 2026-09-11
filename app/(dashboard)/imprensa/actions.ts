'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { fetchLinkPreview } from '@/lib/linkPreview'
import type { MateriaImprensaRow } from '@/types/database'

export async function adicionarMateria(
  formData: FormData,
): Promise<{ error?: string; materia?: MateriaImprensaRow }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const url = (formData.get('url') as string)?.trim()
  if (!url) return { error: 'Informe um link.' }

  let preview
  try {
    preview = await fetchLinkPreview(url)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Não foi possível carregar o preview do link.' }
  }

  const payload = {
    url,
    titulo: preview.titulo,
    descricao: preview.descricao,
    imagem_url: preview.imagem_url,
    site: preview.site,
    criado_por: actor.id,
  }

  const { data: materia, error } = await supabase
    .from('materias_imprensa').insert(payload).select('*').single()

  if (error || !materia) return { error: friendlyError(error, 'Erro ao salvar o link.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'materia',
    resourceId: materia.id, resourceLabel: preview.titulo ?? url,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/imprensa')
  return { materia: materia as MateriaImprensaRow }
}

export async function removerMateria(id: string): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await supabase.from('materias_imprensa').select('*').eq('id', id).single()

  const { data: deleted, error } = await supabase
    .from('materias_imprensa').delete().eq('id', id).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir o link.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'materia',
    resourceId: id, resourceLabel: before?.titulo ?? before?.url ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/imprensa')
  return {}
}
