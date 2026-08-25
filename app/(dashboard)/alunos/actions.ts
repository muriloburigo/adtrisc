'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { requireStaff } from '@/lib/assert'
import { friendlyError } from '@/lib/errors'
import type { AlunoStatus, Parentesco, SexoEnum } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertResponsavel(db: any, alunoId: string, formData: FormData, parentesco: Parentesco) {
  const prefix = parentesco === 'mae' ? 'mae_' : 'pai_'
  const nome = (formData.get(`${prefix}nome`) as string)?.trim()

  const payload = {
    nome: nome || null,
    cpf:        (formData.get(`${prefix}cpf`) as string) || null,
    rg:         (formData.get(`${prefix}rg`) as string) || null,
    email:      (formData.get(`${prefix}email`) as string) || null,
    telefone:   (formData.get(`${prefix}telefone`) as string) || null,
    parentesco,
  }

  // Find existing link for this aluno+parentesco
  const { data: links } = await db
    .from('aluno_responsavel')
    .select('responsavel_id, responsaveis(id, parentesco)')
    .eq('aluno_id', alunoId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingLink = (links ?? []).find((l: any) => l.responsaveis?.parentesco === parentesco)

  if (existingLink) {
    if (!nome) return // nothing to update
    await db.from('responsaveis').update(payload).eq('id', existingLink.responsavel_id)
  } else {
    if (!nome) return // nothing to insert
    const { data: resp, error } = await db
      .from('responsaveis')
      .insert(payload)
      .select('id')
      .single()
    if (error || !resp) return
    await db.from('aluno_responsavel').insert({
      aluno_id: alunoId,
      responsavel_id: resp.id,
      principal: parentesco === 'mae',
    })
  }
}

export async function createAluno(formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const payload = {
    turma_id:        (formData.get('turma_id') as string) || null,
    nome:            formData.get('nome') as string,
    telefone:        (formData.get('telefone') as string) || null,
    sexo:            (formData.get('sexo') as SexoEnum) || null,
    data_nascimento: (formData.get('data_nascimento') as string) || null,
    rua:             (formData.get('rua') as string) || null,
    numero:          (formData.get('numero') as string) || null,
    bairro:          (formData.get('bairro') as string) || null,
    cep:             (formData.get('cep') as string) || null,
    cidade:          (formData.get('cidade') as string) || null,
    observacoes:     (formData.get('observacoes') as string) || null,
    foto_url:        (formData.get('foto_url') as string) || null,
    status:          'ativo' as AlunoStatus,
  }

  const { data: aluno, error } = await db
    .from('alunos').insert(payload).select('id').single()

  if (error || !aluno) return { error: friendlyError(error, 'Erro ao criar aluno.') }

  await upsertResponsavel(db, aluno.id, formData, 'mae')
  await upsertResponsavel(db, aluno.id, formData, 'pai')

  // Registrar matrícula no histórico
  let turmaNomeInicial: string | null = null
  if (payload.turma_id) {
    const { data: t } = await db.from('turmas').select('nome').eq('id', payload.turma_id).single()
    turmaNomeInicial = t?.nome ?? null
  }
  await db.from('historico_atleta').insert({
    aluno_id: aluno.id,
    tipo: 'matricula',
    data: new Date().toISOString().slice(0, 10),
    turma_id: payload.turma_id || null,
    turma_nome: turmaNomeInicial,
  })

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'criar', resource: 'atleta',
    resourceId: aluno.id, resourceLabel: payload.nome,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  redirect('/alunos')
}

export async function updateAluno(id: string, formData: FormData): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await db.from('alunos').select('*').eq('id', id).single()

  const payload = {
    turma_id:        (formData.get('turma_id') as string) || null,
    nome:            formData.get('nome') as string,
    telefone:        (formData.get('telefone') as string) || null,
    sexo:            (formData.get('sexo') as SexoEnum) || null,
    data_nascimento: (formData.get('data_nascimento') as string) || null,
    rua:             (formData.get('rua') as string) || null,
    numero:          (formData.get('numero') as string) || null,
    bairro:          (formData.get('bairro') as string) || null,
    cep:             (formData.get('cep') as string) || null,
    cidade:          (formData.get('cidade') as string) || null,
    status:          ((formData.get('status') as AlunoStatus) || before?.status) as AlunoStatus,
    observacoes:     (formData.get('observacoes') as string) || null,
    foto_url:        (formData.get('foto_url') as string) || null,
  }

  // .select().single() é proposital: um UPDATE bloqueado por RLS não retorna
  // error (0 linhas afetadas não é erro em SQL) — só assim detectamos que
  // nada foi de fato salvo e evitamos reportar sucesso falso pro usuário.
  const { data: updated, error } = await db
    .from('alunos').update(payload).eq('id', id).select('id').single()

  if (error || !updated) return { error: friendlyError(error, 'Erro ao salvar alterações.') }

  await upsertResponsavel(db, id, formData, 'mae')
  await upsertResponsavel(db, id, formData, 'pai')

  const hoje = new Date().toISOString().slice(0, 10)

  // Registrar mudança de turma
  if (before?.turma_id !== payload.turma_id) {
    const [{ data: turmaNova }, { data: turmaAnterior }] = await Promise.all([
      payload.turma_id
        ? db.from('turmas').select('nome').eq('id', payload.turma_id).single()
        : Promise.resolve({ data: null }),
      before?.turma_id
        ? db.from('turmas').select('nome').eq('id', before.turma_id).single()
        : Promise.resolve({ data: null }),
    ])
    await db.from('historico_atleta').insert({
      aluno_id: id,
      tipo: 'mudanca_turma',
      data: hoje,
      turma_id: payload.turma_id || null,
      turma_nome: turmaNova?.nome ?? null,
      turma_anterior_id: before?.turma_id ?? null,
      turma_anterior_nome: turmaAnterior?.nome ?? null,
    })
  }

  // Registrar mudança de status
  if (before?.status !== payload.status) {
    const tipo = payload.status !== 'ativo' ? 'desligamento' : 'reativacao'
    await db.from('historico_atleta').insert({ aluno_id: id, tipo, data: hoje })
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'editar', resource: 'atleta',
    resourceId: id, resourceLabel: payload.nome,
    before: before as Record<string, unknown>,
    after: payload as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  revalidatePath(`/alunos/${id}`)
  redirect(`/alunos/${id}`)
}

export async function removerAlunoTurma(id: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  // Roda como SECURITY DEFINER (supabase/alunos_coach_remove.sql): setar
  // turma_id para null via UPDATE direto falha no RLS mesmo com uma policy
  // permissiva, porque a linha resultante deixa de satisfazer a policy de
  // SELECT do coach (que depende do turma_id). A função valida a permissão
  // (admin ou coach da turma atual) e escreve alunos + historico_atleta
  // atomicamente, contornando essa peculiaridade do RLS.
  const { data, error } = await db
    .rpc('remover_aluno_turma', { p_aluno_id: id })
    .single()

  if (error) return { error: friendlyError(error, 'Erro ao remover atleta da turma.') }
  if (!data) return { error: 'Atleta não encontrado.' }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'atleta',
    resourceId: id, resourceLabel: data.nome,
    before: { status: data.status_anterior, turma_id: data.turma_anterior_id } as Record<string, unknown>,
    after: { status: 'desligado', turma_id: null } as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  revalidatePath(`/alunos/${id}`)
  if (data.turma_anterior_id) revalidatePath(`/turmas/${data.turma_anterior_id}`)
}

export async function atribuirAtletaTurma(alunoId: string, turmaId: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const [{ data: before }, { data: turma }] = await Promise.all([
    db.from('alunos').select('nome, turma_id, status').eq('id', alunoId).single(),
    db.from('turmas').select('nome').eq('id', turmaId).single(),
  ])

  if (!before) return { error: 'Atleta não encontrado.' }
  if (before.turma_id) return { error: 'Este atleta já está em uma turma.' }

  const { data: updated, error } = await db
    .from('alunos')
    .update({ turma_id: turmaId, status: 'ativo' })
    .eq('id', alunoId)
    .select('id')
    .single()

  if (error || !updated) return { error: friendlyError(error, 'Erro ao adicionar atleta à turma.') }

  await db.from('historico_atleta').insert({
    aluno_id: alunoId,
    tipo: before.status !== 'ativo' ? 'reativacao' : 'matricula',
    data: new Date().toISOString().slice(0, 10),
    turma_id: turmaId,
    turma_nome: turma?.nome ?? null,
  })

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'atleta',
    resourceId: alunoId, resourceLabel: before.nome,
    before: { turma_id: null, status: before.status } as Record<string, unknown>,
    after: { turma_id: turmaId, status: 'ativo' } as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  revalidatePath(`/alunos/${alunoId}`)
  revalidatePath(`/turmas/${turmaId}`)
}

export async function deleteAluno(id: string): Promise<{ error?: string } | void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await db.from('alunos').select('*').eq('id', id).single()

  // .select().single() pelo mesmo motivo de updateAluno: DELETE bloqueado
  // por RLS não retorna error, só 0 linhas afetadas.
  const { data: deleted, error } = await db.from('alunos').delete().eq('id', id).select('id').single()
  if (error || !deleted) return { error: friendlyError(error, 'Erro ao excluir aluno.') }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'atleta',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  redirect('/alunos')
}
