'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { lerAssinaturasPdf } from '@/lib/pdfAssinaturas'
import type { DocumentoAssinadoTipo } from '@/types/database'

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function revalidateForTipo(tipo: DocumentoAssinadoTipo, turmaId: string | null) {
  if (tipo === 'relatorio_turma' && turmaId) revalidatePath(`/turmas/${turmaId}/relatorio`)
  if (tipo === 'presenca_exportar') revalidatePath('/presencas/exportar')
  if (tipo === 'diario_aula') revalidatePath('/diario/relatorio')
}

const TAMANHO_MAXIMO = 10 * 1024 * 1024

type MetaDocumento = {
  turmaId: string | null
  coachId: string | null
  tipo: DocumentoAssinadoTipo
  periodo: string
  nomeArquivo: string
}

const TIPOS: DocumentoAssinadoTipo[] = ['relatorio_turma', 'presenca_exportar', 'diario_aula']
const pastaDe = (m: MetaDocumento) => `${m.turmaId ? `turma/${m.turmaId}` : `coach/${m.coachId}`}/${m.tipo}/`

function validarMeta(m: MetaDocumento): string | null {
  if ((!m.turmaId && !m.coachId) || !TIPOS.includes(m.tipo) || !m.periodo) return 'Dados inválidos.'
  if (!m.nomeArquivo.toLowerCase().endsWith('.pdf')) return 'Apenas arquivos PDF são aceitos.'
  return null
}

// O PDF vai do navegador direto para o Storage (uma server action ou função da
// Vercel não aceita corpo acima de ~4,5 MB, e PDFs assinados com fotos passam
// disso). Passo 1: o servidor autoriza e devolve um link de envio de uso único.
export async function prepararEnvioDocumento(
  meta: MetaDocumento & { tamanho: number },
): Promise<{ error?: string; path?: string; token?: string }> {
  const actor = await requireStaff()
  const erro = validarMeta(meta)
  if (erro) return { error: erro }
  if (meta.tamanho > TAMANHO_MAXIMO) return { error: 'Arquivo muito grande (máx 10 MB).' }

  // Só quem pode registrar o documento recebe o link: turma visível pela RLS
  // (admin ou treinador da turma), ou o próprio diário (admin vê todos).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  if (meta.turmaId) {
    const { data } = await supabase.from('turmas').select('id').eq('id', meta.turmaId).maybeSingle()
    if (!data) return { error: 'Acesso negado.' }
  } else if (meta.coachId !== actor.id) {
    const { data: eu } = await supabase.from('profiles').select('role').eq('id', actor.id).single()
    if (eu?.role !== 'admin') return { error: 'Acesso negado.' }
  }

  const path = `${pastaDe(meta)}${Date.now()}-${sanitizeFilename(meta.nomeArquivo)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin.storage.from('documentos').createSignedUploadUrl(path)
  if (error || !data) return { error: 'Não foi possível preparar o envio.' }
  return { path: data.path ?? path, token: data.token }
}

// Passo 2: depois do envio, o servidor confere o arquivo, lê as assinaturas
// digitais e registra o documento. Qualquer falha apaga o arquivo enviado.
export async function registrarDocumentoAssinado(meta: MetaDocumento & { path: string }): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const erro = validarMeta(meta)
  if (erro) return { error: erro }
  if (!meta.path.startsWith(pastaDe(meta)) || meta.path.includes('..')) return { error: 'Dados inválidos.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const descartar = async (msg: string) => {
    await admin.storage.from('documentos').remove([meta.path])
    return { error: msg }
  }

  const { data: arquivo, error: erroDownload } = await admin.storage.from('documentos').download(meta.path)
  if (erroDownload || !arquivo) return { error: 'O arquivo não chegou. Tente enviar de novo.' }
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  if (bytes.length === 0) return descartar('Nenhum arquivo recebido.')
  if (bytes.length > TAMANHO_MAXIMO) return descartar('Arquivo muito grande (máx 10 MB).')
  if (new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).indexOf('%PDF') < 0) return descartar('Apenas arquivos PDF são aceitos.')

  // Quem assinou digitalmente (gov.br etc.), lido do arquivo que está no
  // Storage — o aviso mostrado no navegador antes de enviar é só conveniência.
  const assinaturas = lerAssinaturasPdf(bytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const payload = {
    turma_id: meta.turmaId,
    coach_id: meta.coachId,
    tipo: meta.tipo,
    periodo: meta.periodo,
    nome_arquivo: meta.nomeArquivo,
    storage_path: meta.path,
    enviado_por: actor.id,
    assinaturas_digitais: assinaturas,
  }
  // Insert pelo client normal: a RLS confere de novo se o usuário pode.
  const { data: doc, error } = await supabase
    .from('documentos_assinados').insert(payload).select('id').single()
  if (error || !doc) return descartar(error?.message ?? 'Erro ao salvar documento.')

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'documento',
    resourceId: doc.id, resourceLabel: meta.nomeArquivo,
    after: { ...payload, assinaturas_digitais: assinaturas.map((a) => ({ provedor: a.provedor, nome: a.nome, data: a.data })) },
  })

  revalidateForTipo(meta.tipo, meta.turmaId)
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
