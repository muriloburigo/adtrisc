'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { requireStaff } from '@/lib/assert'
import type { AlunoStatus, Parentesco, SexoEnum } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertResponsavel(db: any, alunoId: string, formData: FormData, parentesco: Parentesco) {
  const prefix = parentesco === 'mae' ? 'mae_' : 'pai_'
  const nome = (formData.get(`${prefix}nome`) as string)?.trim()
  if (!nome) return

  const { data: resp, error } = await db
    .from('responsaveis')
    .insert({
      nome,
      cpf:        (formData.get(`${prefix}cpf`) as string) || null,
      rg:         (formData.get(`${prefix}rg`) as string) || null,
      email:      (formData.get(`${prefix}email`) as string) || null,
      telefone:   (formData.get(`${prefix}telefone`) as string) || null,
      parentesco,
    })
    .select('id')
    .single()

  if (error || !resp) return

  await db.from('aluno_responsavel').insert({
    aluno_id: alunoId,
    responsavel_id: resp.id,
    principal: parentesco === 'mae',
  })
}

export async function createAluno(formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const payload = {
    turma_id:        formData.get('turma_id') as string,
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

  if (error || !aluno) throw new Error(error?.message ?? 'Erro ao criar aluno')

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

export async function updateAluno(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await db.from('alunos').select('*').eq('id', id).single()

  const payload = {
    turma_id:        formData.get('turma_id') as string,
    nome:            formData.get('nome') as string,
    telefone:        (formData.get('telefone') as string) || null,
    sexo:            (formData.get('sexo') as SexoEnum) || null,
    data_nascimento: (formData.get('data_nascimento') as string) || null,
    rua:             (formData.get('rua') as string) || null,
    numero:          (formData.get('numero') as string) || null,
    bairro:          (formData.get('bairro') as string) || null,
    cep:             (formData.get('cep') as string) || null,
    cidade:          (formData.get('cidade') as string) || null,
    status:          formData.get('status') as AlunoStatus,
    observacoes:     (formData.get('observacoes') as string) || null,
    foto_url:        (formData.get('foto_url') as string) || null,
  }

  const { error } = await db.from('alunos').update(payload).eq('id', id)

  if (error) throw new Error(error.message)

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

export async function deleteAluno(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const actor = await requireStaff()

  const { data: before } = await db.from('alunos').select('*').eq('id', id).single()

  const { error } = await db.from('alunos').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'excluir', resource: 'atleta',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: before as Record<string, unknown>,
  })

  revalidatePath('/alunos')
  redirect('/alunos')
}
