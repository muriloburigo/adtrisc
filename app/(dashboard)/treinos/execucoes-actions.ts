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
