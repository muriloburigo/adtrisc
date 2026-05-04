'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  const { data: aluno, error } = await db
    .from('alunos')
    .insert({
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
      status:          'ativo' as AlunoStatus,
    })
    .select('id')
    .single()

  if (error || !aluno) throw new Error(error?.message ?? 'Erro ao criar aluno')

  await upsertResponsavel(db, aluno.id, formData, 'mae')
  await upsertResponsavel(db, aluno.id, formData, 'pai')

  revalidatePath('/alunos')
  redirect('/alunos')
}

export async function updateAluno(id: string, formData: FormData) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any

  const { error } = await db.from('alunos').update({
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
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/alunos')
  revalidatePath(`/alunos/${id}`)
  redirect(`/alunos/${id}`)
}

export async function deleteAluno(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (await createClient()) as any
  const { error } = await db.from('alunos').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/alunos')
  redirect('/alunos')
}
