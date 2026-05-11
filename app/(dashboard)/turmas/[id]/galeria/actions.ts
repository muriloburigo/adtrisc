'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'

export async function addFotoTurma(formData: FormData) {
  await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const turmaId = formData.get('turma_id') as string
  const titulo  = (formData.get('titulo') as string)?.trim()
  const data    = formData.get('data') as string
  const file    = formData.get('file') as File | null

  if (!turmaId || !titulo || !data || !file || file.size === 0) return

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `turmas/${turmaId}/${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('fotos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[addFotoTurma] upload error:', uploadError.message)
    return
  }

  const { data: urlData } = admin.storage.from('fotos').getPublicUrl(path)
  const url = urlData?.publicUrl as string

  await admin.from('turma_fotos').insert({
    turma_id: turmaId,
    titulo,
    data,
    url,
    storage_path: path,
  })

  revalidatePath(`/turmas/${turmaId}`)
}

export async function deleteFotoTurma(fotoId: string, storagePath: string, turmaId: string) {
  await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  await admin.storage.from('fotos').remove([storagePath])
  await admin.from('turma_fotos').delete().eq('id', fotoId)

  revalidatePath(`/turmas/${turmaId}`)
}
