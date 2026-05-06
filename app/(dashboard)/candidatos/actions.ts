'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { requireStaff, requireAdmin } from '@/lib/assert'
import type { CandidatoStatus } from '@/types/database'

// Mulberry32 PRNG — deterministic, given the same seed produces the same sequence
function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return h >>> 0
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let s = hashSeed(seed)
  const rng = () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export async function updateCandidatoStatus(
  id: string,
  status: CandidatoStatus,
): Promise<{ error?: string }> {
  const actor = await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: before } = await supabase
    .from('candidatos').select('nome, status, turma_id').eq('id', id).single()

  const { error } = await supabase
    .from('candidatos').update({ status }).eq('id', id)
  if (error) return { error: error.message }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'status', resource: 'candidato',
    resourceId: id, resourceLabel: before?.nome ?? null,
    before: { status: before?.status },
    after:  { status },
  })

  revalidatePath('/candidatos')
  revalidatePath(`/candidatos/${id}`)
  return {}
}

export async function realizarSorteio(
  turmaId: string,
): Promise<{ sorteioId?: string; error?: string }> {
  let actor: { id: string; name: string }
  try { actor = await requireAdmin() }
  catch { return { error: 'Apenas administradores podem realizar o sorteio.' } }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data: turma } = await supabase
    .from('turmas').select('capacidade, nome').eq('id', turmaId).single()
  if (!turma) return { error: 'Turma não encontrada.' }

  // Pool = novos candidatos (pendente) + lista de espera (nao_sorteado de sorteios anteriores)
  const { data: todos } = await supabase
    .from('candidatos')
    .select('id, nome, status')
    .eq('turma_id', turmaId)
    .in('status', ['pendente', 'nao_sorteado'])
    .order('created_at', { ascending: true })

  if (!todos || todos.length === 0)
    return { error: 'Não há candidatos para sortear (nem pendentes nem lista de espera).' }

  type C = { id: string; nome: string; status: string }
  const snapshot = (todos as C[]).map((c, i) => ({
    posicao_inscricao: i + 1,
    candidato_id: c.id,
    nome: c.nome,
  }))

  const seed = crypto.randomUUID()
  const shuffled = seededShuffle(todos as C[], seed)
  const vagas = turma.capacidade as number

  const resultado = shuffled.map((c, i) => ({
    posicao: i + 1,
    candidato_id: c.id,
    nome: c.nome,
    sorteado: i < vagas,
  }))

  const { data: sorteio, error: insertErr } = await supabase
    .from('sorteios')
    .insert({
      turma_id: turmaId,
      realizado_por: actor.id,
      realizado_em: new Date().toISOString(),
      seed,
      vagas,
      total_candidatos: todos.length,
      candidatos_snapshot: snapshot,
      resultado,
    })
    .select('id')
    .single()

  if (insertErr) return { error: insertErr.message }

  const sorteadosIds    = resultado.filter(r => r.sorteado).map(r => r.candidato_id)
  const listaEsperaIds  = resultado.filter(r => !r.sorteado).map(r => r.candidato_id)

  if (sorteadosIds.length > 0)
    await supabase.from('candidatos').update({ status: 'sorteado' }).in('id', sorteadosIds)
  // Não sorteados voltam/permanecem na lista de espera
  if (listaEsperaIds.length > 0)
    await supabase.from('candidatos').update({ status: 'nao_sorteado' }).in('id', listaEsperaIds)

  const pendentesCount   = (todos as C[]).filter(c => c.status === 'pendente').length
  const listaEsperaCount = (todos as C[]).filter(c => c.status === 'nao_sorteado').length

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: 'sorteio', resource: 'candidato',
    resourceId: sorteio.id,
    resourceLabel: turma.nome,
    metadata: {
      turma_id: turmaId,
      turma_nome: turma.nome,
      total_candidatos: todos.length,
      pendentes: pendentesCount,
      lista_espera: listaEsperaCount,
      vagas,
      sorteados: sorteadosIds.length,
      nao_sorteados: listaEsperaIds.length,
      sorteio_id: sorteio.id,
    },
  })

  revalidatePath('/candidatos')
  return { sorteioId: sorteio.id as string }
}

export async function saveObservacoesInternas(
  id: string,
  observacoes: string,
): Promise<{ error?: string }> {
  await requireStaff()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { error } = await supabase
    .from('candidatos')
    .update({ observacoes_internas: observacoes || null })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/candidatos/${id}`)
  return {}
}
