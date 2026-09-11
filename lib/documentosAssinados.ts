'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import type { DocumentoAssinadoTipo } from '@/types/database'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function revalidateForTipo(tipo: DocumentoAssinadoTipo, turmaId: string | null) {
  if (tipo === 'relatorio_turma' && turmaId) revalidatePath(`/turmas/${turmaId}/relatorio`)
  if (tipo === 'presenca_exportar') revalidatePath('/presencas/exportar')
  if (tipo === 'diario_aula') revalidatePath('/diario/relatorio')
}

export async function uploadDocumentoAssinado(formData: FormData): Promise<{ error?: string }> {
  const actor = await requireStaff()

  const turmaId = (formData.get('turma_id') as string) || null
  const coachId = (formData.get('coach_id') as string) || null
  const tipo    = formData.get('tipo') as DocumentoAssinadoTipo
  const periodo = formData.get('periodo') as string
  const file    = formData.get('file') as File | null

  if ((!turmaId && !coachId) || !tipo || !periodo) return { error: 'Dados inválidos.' }
  if (!file || file.size === 0) return { error: 'Nenhum arquivo recebido.' }
  if (file.type !== 'application/pdf') return { error: 'Apenas arquivos PDF são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Arquivo muito grande (máx 10 MB).' }

  const owner = turmaId ? `turma/${turmaId}` : `coach/${coachId}`
  const path  = `${owner}/${tipo}/${Date.now()}-${sanitizeFilename(file.name)}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: uploadError } = await admin.storage
    .from('documentos')
    .upload(path, file, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return { error: uploadError.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const payload = {
    turma_id: turmaId,
    coach_id: coachId,
    tipo,
    periodo,
    nome_arquivo: file.name,
    storage_path: path,
    enviado_por: actor.id,
  }
  const { data: doc, error } = await supabase
    .from('documentos_assinados').insert(payload).select('id').single()

  if (error || !doc) {
    await admin.storage.from('documentos').remove([path])
    return { error: error?.message ?? 'Erro ao salvar documento.' }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'documento',
    resourceId: doc.id, resourceLabel: file.name,
    after: payload as Record<string, unknown>,
  })

  revalidateForTipo(tipo, turmaId)
  return {}
}

export async function deleteDocumentoAssinado(
  id: string,
  storagePath: string,
  tipo: DocumentoAssinadoTipo,
  turmaId: string | null,
): Promise<{ error?: string }> {
  const actor = await requireStaff()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: deleted, error } = await supabase
    .from('documentos_assinados').delete().eq('id', id).select('*')
  if (error) return { error: error.message }
  if (!deleted || deleted.length === 0) return { error: 'Acesso negado.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.storage.from('documentos').remove([storagePath])

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'documento',
    resourceId: id, resourceLabel: deleted[0]?.nome_arquivo ?? null,
    before: deleted[0] as Record<string, unknown>,
  })

  revalidateForTipo(tipo, turmaId)
  return {}
}
