'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import type { DocumentoAssinadoTipo } from '@/types/database'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function uploadDocumentoAssinado(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireStaff()

  const turmaId = formData.get('turma_id') as string
  const tipo    = formData.get('tipo') as DocumentoAssinadoTipo
  const periodo = formData.get('periodo') as string
  const file    = formData.get('file') as File | null

  if (!turmaId || !tipo || !periodo) return { error: 'Dados inválidos.' }
  if (!file || file.size === 0) return { error: 'Nenhum arquivo recebido.' }
  if (file.type !== 'application/pdf') return { error: 'Apenas arquivos PDF são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande (máx 10 MB).' }

  const path = `${turmaId}/${tipo}/${Date.now()}-${sanitizeFilename(file.name)}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: uploadError } = await admin.storage
    .from('documentos')
    .upload(path, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return { error: uploadError.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { error } = await supabase.from('documentos_assinados').insert({
    turma_id: turmaId,
    tipo,
    periodo,
    nome_arquivo: file.name,
    storage_path: path,
    enviado_por: actor.id,
  })

  if (error) {
    await admin.storage.from('documentos').remove([path])
    return { error: error.message }
  }

  revalidatePath(`/turmas/${turmaId}/relatorio`)
  revalidatePath('/presencas/exportar')
  return {}
}

export async function deleteDocumentoAssinado(
  id: string,
  storagePath: string,
  turmaId: string,
): Promise<{ error?: string }> {
  await requireStaff()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: deleted, error } = await supabase
    .from('documentos_assinados').delete().eq('id', id).select('id')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'Acesso negado.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.storage.from('documentos').remove([storagePath])

  revalidatePath(`/turmas/${turmaId}/relatorio`)
  revalidatePath('/presencas/exportar')
  return {}
}
