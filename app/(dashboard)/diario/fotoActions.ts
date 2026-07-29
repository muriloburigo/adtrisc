'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import { getTurmaIdsForCoach } from '@/lib/turmas'

async function assertTurmaAccess(turmaId: string) {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', actor.id).single()
  if (profile?.role === 'admin') return
  const turmaIds = await getTurmaIdsForCoach(supabase, actor.id)
  if (!turmaIds.includes(turmaId)) throw new Error('Acesso negado')
}

export type FotoDoDia = { id: string; url: string; titulo: string; turma_id: string; storage_path: string }

export async function setFotoDoDia(formData: FormData): Promise<{ error?: string; foto?: FotoDoDia }> {
  const turmaId = formData.get('turma_id') as string
  const data    = formData.get('data') as string
  const titulo  = ((formData.get('titulo') as string) || '').trim()
  const file    = formData.get('file') as File | null

  if (!turmaId || !data) return { error: 'Dados inválidos.' }

  try {
    await assertTurmaAccess(turmaId)
  } catch {
    return { error: 'Acesso negado.' }
  }

  if (!file || file.size === 0) return { error: 'Nenhuma imagem recebida.' }
  if (!file.type.startsWith('image/')) return { error: 'Apenas imagens são aceitas.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Imagem muito grande (máx 5 MB).' }

  const ext  = file.type === 'image/png' ? 'png' : 'jpg'
  const path = `turmas/${turmaId}/${data}.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { error: uploadError } = await admin.storage
    .from('fotos')
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: '0' })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = admin.storage.from('fotos').getPublicUrl(path)
  // cache-bust: o caminho é determinístico (uma foto por turma/dia), então uma
  // troca precisa de uma URL diferente pra não mostrar a imagem antiga em cache.
  const url = `${urlData.publicUrl}?v=${Date.now()}`

  const { data: saved, error } = await admin.from('turma_fotos').upsert(
    {
      turma_id: turmaId,
      data,
      titulo: titulo || '',
      url,
      storage_path: path,
    },
    { onConflict: 'turma_id,data' },
  ).select('id, url, titulo, turma_id, storage_path').single()

  if (error) return { error: error.message }

  revalidatePath('/diario')
  return { foto: saved as FotoDoDia }
}

export async function removerFotoDoDia(
  turmaId: string,
  data: string,
  storagePath: string,
): Promise<{ error?: string }> {
  try {
    await assertTurmaAccess(turmaId)
  } catch {
    return { error: 'Acesso negado.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.storage.from('fotos').remove([storagePath])
  const { error } = await admin.from('turma_fotos').delete().eq('turma_id', turmaId).eq('data', data)
  if (error) return { error: error.message }

  revalidatePath('/diario')
  return {}
}
