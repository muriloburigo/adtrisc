'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'

export async function uploadAvatar(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    await requireStaff()
  } catch {
    return { error: 'Sem permissão.' }
  }

  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string | null) ?? 'misc'

  if (!file || file.size === 0) return { error: 'Nenhum arquivo recebido.' }
  if (file.size > 3 * 1024 * 1024) return { error: 'Imagem muito grande (máx 3 MB).' }

  // Allowlist fechada — não usar startsWith('image/'), que também aceita
  // image/svg+xml (SVG pode conter <script>, e viraria XSS armazenado servido
  // com esse content-type pro bucket público).
  const EXT_BY_TYPE: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const ext = EXT_BY_TYPE[file.type]
  if (!ext) return { error: 'Apenas imagens JPEG, PNG ou WebP são aceitas.' }
  const filename = `${folder}/${crypto.randomUUID()}.${ext}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await admin.storage
    .from('avatars')
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
      cacheControl: '31536000',
    })

  if (error) return { error: error.message }

  const { data } = admin.storage.from('avatars').getPublicUrl(filename)
  return { url: data.publicUrl as string }
}
