'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff, requireAdmin } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { sanitizeFilename, NOTA_FISCAL_TIPOS_VALIDOS, NOTA_FISCAL_MAX_BYTES } from '@/lib/financeiro'

// ── Categorias ──────────────────────────────────────────────────────────────

export async function createCategoria(formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const nome = (formData.get('nome') as string)?.trim()
  if (!nome) return { error: 'Informe o nome da categoria.' }

  const { data: categoria, error } = await supabase
    .from('categorias_financeiras').insert({ nome }).select('id').single()
  if (error || !categoria) return { error: friendlyError(error, 'Erro ao criar categoria.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'financeiro',
    resourceId: categoria.id, resourceLabel: `Categoria ${nome}`,
    after: { nome } as Record<string, unknown>,
  })

  revalidatePath('/financeiro/categorias')
}

export async function updateCategoria(
  id: string,
  patch: { nome?: string; ativo?: boolean },
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const payload: Record<string, unknown> = {}
  if (patch.nome !== undefined) payload.nome = patch.nome.trim()
  if (patch.ativo !== undefined) payload.ativo = patch.ativo
  if (Object.keys(payload).length === 0) return { error: 'Nada para salvar.' }

  const { data: updated, error } = await supabase
    .from('categorias_financeiras').update(payload).eq('id', id).select('nome').single()
  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar categoria.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'financeiro',
    resourceId: id, resourceLabel: `Categoria ${updated.nome}`,
    after: payload,
  })

  revalidatePath('/financeiro/categorias')
}

// ── Projetos ────────────────────────────────────────────────────────────────

export async function createProjeto(formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const nome = (formData.get('nome') as string)?.trim()
  const ano = Number(formData.get('ano'))
  const descricao = (formData.get('descricao') as string)?.trim() || null
  const objetivo = (formData.get('objetivo') as string)?.trim() || null
  const metas = (formData.get('metas') as string)?.trim() || null

  if (!nome) return { error: 'Informe o nome do projeto.' }
  if (!ano || ano < 2000) return { error: 'Informe um ano válido.' }

  const payload = { nome, ano, descricao, objetivo, metas, criado_por: actor.id }

  const { data: projeto, error } = await supabase
    .from('projetos_financeiros').insert(payload).select('id').single()
  if (error || !projeto) return { error: friendlyError(error, 'Erro ao criar projeto.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'financeiro',
    resourceId: projeto.id, resourceLabel: nome,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/projetos')
  redirect(`/financeiro/projetos/${projeto.id}`)
}

export async function updateProjeto(id: string, formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const { data: before } = await supabase.from('projetos_financeiros').select('*').eq('id', id).single()

  const nome = (formData.get('nome') as string)?.trim()
  const ano = Number(formData.get('ano'))
  const descricao = (formData.get('descricao') as string)?.trim() || null
  const objetivo = (formData.get('objetivo') as string)?.trim() || null
  const metas = (formData.get('metas') as string)?.trim() || null
  const ativo = formData.get('ativo') === 'on'

  if (!nome) return { error: 'Informe o nome do projeto.' }
  if (!ano || ano < 2000) return { error: 'Informe um ano válido.' }

  const payload = { nome, ano, descricao, objetivo, metas, ativo }

  const { data: updated, error } = await supabase
    .from('projetos_financeiros').update(payload).eq('id', id).select('id').single()
  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar projeto.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'financeiro',
    resourceId: id, resourceLabel: nome,
    before: before as Record<string, unknown>,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/projetos')
  revalidatePath(`/financeiro/projetos/${id}`)
}

export async function deleteProjeto(id: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const { data: before } = await supabase.from('projetos_financeiros').select('*').eq('id', id).single()

  const { data: deleted, error } = await supabase
    .from('projetos_financeiros').delete().eq('id', id).select('id').single()
  if (error || !deleted) {
    if (error?.code === '23503') return { error: 'Este projeto já tem notas fiscais lançadas e não pode ser excluído. Desative-o em vez disso.' }
    return { error: friendlyError(error, 'Erro ao excluir projeto.') }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'financeiro',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/projetos')
  redirect('/financeiro/projetos')
}

// ── Anexos do projeto ───────────────────────────────────────────────────────

export async function uploadProjetoArquivo(projetoId: string, formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const file = formData.get('arquivo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo recebido.' }
  if (!NOTA_FISCAL_TIPOS_VALIDOS.has(file.type)) return { error: 'Formato de arquivo inválido. Envie PDF, JPG, PNG ou WebP.' }
  if (file.size > NOTA_FISCAL_MAX_BYTES) return { error: 'Arquivo muito grande (máx 10 MB).' }

  const storagePath = `${projetoId}/${Date.now()}-${sanitizeFilename(file.name)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { error: uploadError } = await admin.storage
    .from('financeiro-arquivos')
    .upload(storagePath, file, { contentType: file.type, upsert: false })
  if (uploadError) return { error: 'Erro ao enviar o arquivo: ' + uploadError.message }

  const payload = { projeto_id: projetoId, nome_arquivo: file.name, storage_path: storagePath, enviado_por: actor.id }
  const { data: arquivo, error } = await supabase
    .from('projeto_arquivos').insert(payload).select('id').single()

  if (error || !arquivo) {
    await admin.storage.from('financeiro-arquivos').remove([storagePath])
    return { error: friendlyError(error, 'Erro ao salvar arquivo.') }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'financeiro',
    resourceId: projetoId, resourceLabel: `Anexo — ${file.name}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath(`/financeiro/projetos/${projetoId}`)
}

export async function deleteProjetoArquivo(id: string, storagePath: string, projetoId: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  const { data: deleted, error } = await supabase
    .from('projeto_arquivos').delete().eq('id', id).select('nome_arquivo').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir arquivo.') }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  await admin.storage.from('financeiro-arquivos').remove([storagePath])

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'financeiro',
    resourceId: projetoId, resourceLabel: `Anexo — ${deleted.nome_arquivo}`,
  })

  revalidatePath(`/financeiro/projetos/${projetoId}`)
}

// ── Orçamento ───────────────────────────────────────────────────────────────

export async function saveOrcamento(
  projetoId: string,
  categoriaId: string,
  valor: number,
): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const actor = await requireAdmin()

  if (!Number.isFinite(valor) || valor < 0) return { error: 'Informe um valor válido.' }

  const payload = { projeto_id: projetoId, categoria_id: categoriaId, valor_orcado: valor, updated_at: new Date().toISOString() }

  const { error } = await supabase
    .from('orcamentos_financeiros').upsert(payload, { onConflict: 'projeto_id,categoria_id' })
  if (error) return { error: friendlyError(error, 'Erro ao salvar orçamento.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'financeiro',
    resourceId: projetoId, resourceLabel: 'Orçamento por categoria',
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath(`/financeiro/projetos/${projetoId}`)
}

// ── Lançamentos (notas fiscais) ───────────────────────────────────────────

async function getRole(actorId: string): Promise<'admin' | 'coach'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('profiles').select('role').eq('id', actorId).single()
  return data?.role === 'admin' ? 'admin' : 'coach'
}

export async function createLancamento(formData: FormData): Promise<{ error?: string } | void> {
  const actor = await requireStaff()
  const role = await getRole(actor.id)

  const projetoId = formData.get('projeto_id') as string
  const categoriaId = formData.get('categoria_id') as string
  const valorRaw = formData.get('valor') as string
  const descricao = (formData.get('descricao') as string)?.trim()
  const numeroNota = (formData.get('numero_nota') as string)?.trim() || null
  const data = formData.get('data') as string
  const coachIdForm = formData.get('coach_id') as string
  const file = formData.get('arquivo') as File | null

  const coachId = role === 'admin' && coachIdForm ? coachIdForm : actor.id

  const valor = Number(valorRaw?.replace(',', '.'))
  if (!projetoId || !categoriaId) return { error: 'Selecione o projeto e a categoria.' }
  if (!Number.isFinite(valor) || valor <= 0) return { error: 'Informe um valor válido.' }
  if (!descricao) return { error: 'Descreva a despesa.' }
  if (!data) return { error: 'Informe a data da nota.' }

  let storagePath: string | null = null
  let nomeArquivo: string | null = null

  if (file && file.size > 0) {
    if (!NOTA_FISCAL_TIPOS_VALIDOS.has(file.type)) return { error: 'Formato de arquivo inválido. Envie PDF, JPG, PNG ou WebP.' }
    if (file.size > NOTA_FISCAL_MAX_BYTES) return { error: 'Arquivo muito grande (máx 10 MB).' }

    storagePath = `${projetoId}/${categoriaId}/${Date.now()}-${sanitizeFilename(file.name)}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { error: uploadError } = await admin.storage
      .from('notas-fiscais')
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (uploadError) return { error: 'Erro ao enviar o anexo: ' + uploadError.message }
    nomeArquivo = file.name
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const payload = {
    projeto_id: projetoId, categoria_id: categoriaId, coach_id: coachId,
    valor, descricao, numero_nota: numeroNota, data,
    nome_arquivo: nomeArquivo, storage_path: storagePath,
  }

  const { data: lancamento, error } = await supabase
    .from('lancamentos_financeiros').insert(payload).select('id').single()

  if (error || !lancamento) {
    if (storagePath) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any
      await admin.storage.from('notas-fiscais').remove([storagePath])
    }
    return { error: friendlyError(error, 'Erro ao lançar nota fiscal.') }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'financeiro',
    resourceId: lancamento.id, resourceLabel: `Nota fiscal — ${descricao}`,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/notas')
  redirect('/financeiro/notas')
}

export async function updateLancamento(id: string, formData: FormData): Promise<{ error?: string } | void> {
  const actor = await requireStaff()
  const role = await getRole(actor.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: before } = await supabase.from('lancamentos_financeiros').select('*').eq('id', id).single()
  if (!before) return { error: 'Nota não encontrada.' }
  if (role !== 'admin' && before.coach_id !== actor.id) return { error: 'Você só pode editar suas próprias notas.' }

  const projetoId = formData.get('projeto_id') as string
  const categoriaId = formData.get('categoria_id') as string
  const valorRaw = formData.get('valor') as string
  const descricao = (formData.get('descricao') as string)?.trim()
  const numeroNota = (formData.get('numero_nota') as string)?.trim() || null
  const data = formData.get('data') as string
  const file = formData.get('arquivo') as File | null

  const valor = Number(valorRaw?.replace(',', '.'))
  if (!projetoId || !categoriaId) return { error: 'Selecione o projeto e a categoria.' }
  if (!Number.isFinite(valor) || valor <= 0) return { error: 'Informe um valor válido.' }
  if (!descricao) return { error: 'Descreva a despesa.' }
  if (!data) return { error: 'Informe a data da nota.' }

  let storagePath = before.storage_path as string | null
  let nomeArquivo = before.nome_arquivo as string | null
  const oldStoragePath = before.storage_path as string | null

  if (file && file.size > 0) {
    if (!NOTA_FISCAL_TIPOS_VALIDOS.has(file.type)) return { error: 'Formato de arquivo inválido. Envie PDF, JPG, PNG ou WebP.' }
    if (file.size > NOTA_FISCAL_MAX_BYTES) return { error: 'Arquivo muito grande (máx 10 MB).' }

    storagePath = `${projetoId}/${categoriaId}/${Date.now()}-${sanitizeFilename(file.name)}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    const { error: uploadError } = await admin.storage
      .from('notas-fiscais')
      .upload(storagePath, file, { contentType: file.type, upsert: false })
    if (uploadError) return { error: 'Erro ao enviar o anexo: ' + uploadError.message }
    nomeArquivo = file.name
  }

  const payload = {
    projeto_id: projetoId, categoria_id: categoriaId,
    valor, descricao, numero_nota: numeroNota, data,
    nome_arquivo: nomeArquivo, storage_path: storagePath,
    updated_at: new Date().toISOString(),
  }

  const { data: updated, error } = await supabase
    .from('lancamentos_financeiros').update(payload).eq('id', id).select('id').single()
  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar alterações.') }

  if (file && file.size > 0 && oldStoragePath) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await admin.storage.from('notas-fiscais').remove([oldStoragePath])
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'financeiro',
    resourceId: id, resourceLabel: `Nota fiscal — ${descricao}`,
    before: before as Record<string, unknown>,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/notas')
  redirect('/financeiro/notas')
}

export async function deleteLancamento(id: string): Promise<{ error?: string } | void> {
  const actor = await requireStaff()
  const role = await getRole(actor.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: before } = await supabase.from('lancamentos_financeiros').select('*').eq('id', id).single()
  if (!before) return { error: 'Nota não encontrada.' }
  if (role !== 'admin' && before.coach_id !== actor.id) return { error: 'Você só pode excluir suas próprias notas.' }

  const { data: deleted, error } = await supabase
    .from('lancamentos_financeiros').delete().eq('id', id).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir nota fiscal.') }

  if (before.storage_path) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any
    await admin.storage.from('notas-fiscais').remove([before.storage_path])
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'financeiro',
    resourceId: id, resourceLabel: `Nota fiscal — ${before.descricao}`,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/financeiro')
  revalidatePath('/financeiro/notas')
}
