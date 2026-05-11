'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/assert'
import { createAdminClient } from '@/lib/supabase/admin'

export async function criarFicha(
  alunoId: string
): Promise<{ url?: string; error?: string }> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const [{ data: aluno }, { data: respsRaw }] = await Promise.all([
    db.from('alunos').select('*').eq('id', alunoId).single(),
    db
      .from('responsaveis')
      .select('*, aluno_responsavel!inner(aluno_id)')
      .eq('aluno_responsavel.aluno_id', alunoId),
  ])

  if (!aluno) return { error: 'Atleta não encontrado.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resps = (respsRaw ?? []) as any[]
  const mae = resps.find((r) => r.parentesco === 'mae')
  const pai = resps.find((r) => r.parentesco === 'pai')

  const { data: ficha, error } = await db
    .from('fichas_inscricao')
    .insert({
      aluno_id:          alunoId,
      gerado_por:        actor.id,
      p_nome:            aluno.nome,
      p_telefone:        aluno.telefone,
      p_sexo:            aluno.sexo,
      p_data_nascimento: aluno.data_nascimento,
      p_rua:             aluno.rua,
      p_numero:          aluno.numero,
      p_bairro:          aluno.bairro,
      p_cep:             aluno.cep,
      p_cidade:          aluno.cidade,
      mae_nome:          mae?.nome     ?? null,
      mae_cpf:           mae?.cpf      ?? null,
      mae_rg:            mae?.rg       ?? null,
      mae_email:         mae?.email    ?? null,
      mae_telefone:      mae?.telefone ?? null,
      pai_nome:          pai?.nome     ?? null,
      pai_cpf:           pai?.cpf      ?? null,
      pai_rg:            pai?.rg       ?? null,
      pai_email:         pai?.email    ?? null,
      pai_telefone:      pai?.telefone ?? null,
    })
    .select('token')
    .single()

  if (error || !ficha) return { error: error?.message ?? 'Erro ao criar ficha.' }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://adtrisc.vercel.app'
  const url = `${base}/ficha/${ficha.token}`

  revalidatePath(`/alunos/${alunoId}`)
  return { url }
}

export async function criarFichasTurma(turmaId: string): Promise<{
  error?: string
  results?: Array<{ alunoId: string; nome: string; token: string; url: string; telefone: string | null; email: string | null; novo: boolean }>
}> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://adtrisc.vercel.app'

  const { data: alunos } = await db
    .from('alunos')
    .select('id, nome, telefone, sexo, data_nascimento, rua, numero, bairro, cep, cidade')
    .eq('turma_id', turmaId)
    .eq('status', 'ativo')
    .order('nome')

  if (!alunos?.length) return { error: 'Nenhum atleta ativo nesta turma.' }

  const alunoIds = alunos.map((a: any) => a.id)

  const [{ data: existingFichas }, { data: respsRaw }] = await Promise.all([
    db.from('fichas_inscricao').select('aluno_id, token').in('aluno_id', alunoIds).eq('status', 'pendente'),
    db.from('responsaveis').select('*, aluno_responsavel!inner(aluno_id)').in('aluno_responsavel.aluno_id', alunoIds),
  ])

  const existingMap = new Map<string, string>((existingFichas ?? []).map((f: any) => [f.aluno_id, f.token]))

  const respsByAluno = new Map<string, any[]>()
  for (const r of (respsRaw ?? []) as any[]) {
    const links = Array.isArray(r.aluno_responsavel) ? r.aluno_responsavel : [r.aluno_responsavel]
    for (const link of links) {
      if (!link?.aluno_id) continue
      if (!respsByAluno.has(link.aluno_id)) respsByAluno.set(link.aluno_id, [])
      respsByAluno.get(link.aluno_id)!.push(r)
    }
  }

  const toInsert = alunos
    .filter((a: any) => !existingMap.has(a.id))
    .map((aluno: any) => {
      const resps = respsByAluno.get(aluno.id) ?? []
      const mae = resps.find((r: any) => r.parentesco === 'mae')
      const pai = resps.find((r: any) => r.parentesco === 'pai')
      return {
        aluno_id: aluno.id, gerado_por: actor.id,
        p_nome: aluno.nome, p_telefone: aluno.telefone, p_sexo: aluno.sexo,
        p_data_nascimento: aluno.data_nascimento, p_rua: aluno.rua, p_numero: aluno.numero,
        p_bairro: aluno.bairro, p_cep: aluno.cep, p_cidade: aluno.cidade,
        mae_nome: mae?.nome ?? null, mae_cpf: mae?.cpf ?? null, mae_rg: mae?.rg ?? null,
        mae_email: mae?.email ?? null, mae_telefone: mae?.telefone ?? null,
        pai_nome: pai?.nome ?? null, pai_cpf: pai?.cpf ?? null, pai_rg: pai?.rg ?? null,
        pai_email: pai?.email ?? null, pai_telefone: pai?.telefone ?? null,
      }
    })

  let newMap = new Map<string, string>()
  if (toInsert.length > 0) {
    const { data: newFichas, error } = await db.from('fichas_inscricao').insert(toInsert).select('aluno_id, token')
    if (error) return { error: error.message }
    newMap = new Map((newFichas ?? []).map((f: any) => [f.aluno_id, f.token]))
  }

  const results = alunos.flatMap((aluno: any) => {
    const token = existingMap.get(aluno.id) ?? newMap.get(aluno.id)
    if (!token) return []
    const resps = respsByAluno.get(aluno.id) ?? []
    const mae = resps.find((r: any) => r.parentesco === 'mae')
    const pai = resps.find((r: any) => r.parentesco === 'pai')
    return [{
      alunoId: aluno.id, nome: aluno.nome, token, url: `${base}/ficha/${token}`,
      telefone: mae?.telefone ?? pai?.telefone ?? aluno.telefone ?? null,
      email: mae?.email ?? pai?.email ?? null,
      novo: !existingMap.has(aluno.id),
    }]
  })

  revalidatePath(`/turmas/${turmaId}`)
  return { results }
}

export async function invalidarFicha(fichaId: string, alunoId: string): Promise<{ error?: string }> {
  await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { error } = await db
    .from('fichas_inscricao')
    .update({ status: 'expirada' })
    .eq('id', fichaId)
  if (error) return { error: error.message }
  revalidatePath(`/alunos/${alunoId}`)
  return {}
}
