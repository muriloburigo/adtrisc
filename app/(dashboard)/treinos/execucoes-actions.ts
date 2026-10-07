'use server'

import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { alunoDaExecucao, atorParaAtleta } from '@/lib/treinos/acesso'
import * as ex from '@/lib/treinos/execucoes'

// Atividades extras e vínculos — usadas pela equipe (calendário do atleta) e
// pelo próprio atleta (portal). O acesso é conferido pelo dono da atividade.

async function autorizar(execId: string) {
  const aluno = await alunoDaExecucao(execId)
  return aluno ? atorParaAtleta(aluno) : null
}
const revalidar = () => { revalidatePath('/treinos', 'layout'); revalidatePath('/portal', 'layout') }

async function executar(execId: string, rotulo: string, fn: () => Promise<{ error?: string }>, sessaoId?: string) {
  const ator = await autorizar(execId)
  if (!ator) return { error: 'Sem acesso.' }
  if (sessaoId) {
    // O treino de destino precisa ser visível para quem vincula (RLS).
    const { data } = await ator.db.from('treino_sessoes').select('id').eq('id', sessaoId).maybeSingle()
    if (!data) return { error: 'Treino não encontrado.' }
  }
  const r = await fn()
  if (r.error) return r
  await logAudit({ userId: ator.userId, userName: ator.nome, action: 'editar', resource: ator.papel === 'atleta' ? 'portal' : 'treino', resourceId: execId, resourceLabel: rotulo })
  revalidar()
  return {}
}

export async function vincularAtividade(execId: string, sessaoId: string) { return executar(execId, 'Vinculou atividade a um treino', () => ex.vincular(execId, sessaoId), sessaoId) }
export async function desvincularAtividade(execId: string) { return executar(execId, 'Desvinculou atividade do treino', () => ex.desvincular(execId)) }
export async function apagarAtividade(execId: string) { return executar(execId, 'Apagou atividade', () => ex.apagarExecucao(execId)) }
export async function moverAtividade(execId: string, data: string) { return executar(execId, `Moveu atividade extra para ${data}`, () => ex.moverExtra(execId, data)) }

/**
 * Ordem pessoal dos cards de um dia do atleta (arrastar no calendário do atleta
 * ou no portal). `itens` na ordem desejada: `s:<sessão>` (treino, com ou sem
 * atividade vinculada) e `x:<execução>` (atividade extra).
 */
export async function ordenarDiaDoAtleta(alunoId: string, itens: string[]): Promise<{ error?: string }> {
  if (!Array.isArray(itens) || itens.length > 30) return { error: 'Lista inválida.' }
  const ator = await atorParaAtleta(alunoId)
  if (!ator) return { error: 'Sem acesso.' }
  const sessoes = itens.filter((i) => i.startsWith('s:')).map((i) => i.slice(2))
  // Treinos: precisam ser visíveis para quem ordena (RLS). Extras: do próprio atleta.
  if (sessoes.length) {
    const { data } = await ator.db.from('treino_sessoes').select('id').in('id', sessoes)
    if ((data ?? []).length !== new Set(sessoes).size) return { error: 'Treino não encontrado.' }
  }
  if (itens.some((i) => !/^[sx]:/.test(i))) return { error: 'Lista inválida.' }
  const r = await ex.ordenarDia(alunoId, itens.map((i) => ({ tipo: i[0] as 's' | 'x', id: i.slice(2) })))
  if (r.error) return r
  revalidar()
  return {}
}
