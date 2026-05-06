'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'

const BUCKET = 'avatars'

export async function addTurmaFoto(
  turmaId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  let actor: { id: string; name: string }
  try { actor = await requireStaff() }
  catch { return { error: 'Sem permissão.' } }

  const file   = formData.get('file') as File | null
  const titulo = (formData.get('titulo') as string | null)?.trim()
  const data   = (formData.get('data') as string | null)

  if (!file || file.size === 0) return { error: 'Selecione uma imagem.' }
  if (!titulo) return { error: 'Informe um título.' }
  if (!data) return { error: 'Informe a data.' }
  if (file.size > 15 * 1024 * 1024) return { error: 'Imagem muito grande (máx 15 MB).' }

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const storagePath = `turmas/${crypto.randomUUID()}.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000',
    })

  if (uploadErr) return { error: uploadErr.message }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath)

  const { error: insertErr } = await admin.from('turma_fotos').insert({
    turma_id: turmaId,
    url: publicUrl,
    storage_path: storagePath,
    titulo,
    data,
    uploaded_by: actor.id,
  })

  if (insertErr) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return { error: insertErr.message }
  }

  revalidatePath(`/turmas/${turmaId}`)
  return {}
}

export async function deleteTurmaFoto(
  fotoId: string,
  storagePath: string,
  turmaId: string,
): Promise<{ error?: string }> {
  try { await requireStaff() }
  catch { return { error: 'Sem permissão.' } }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const { error } = await admin.from('turma_fotos').delete().eq('id', fotoId)
  if (error) return { error: error.message }

  await admin.storage.from(BUCKET).remove([storagePath])

  revalidatePath(`/turmas/${turmaId}`)
  return {}
}
