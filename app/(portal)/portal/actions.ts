'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/audit'
import { atletaLogado } from '@/lib/portalAtleta'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
const SITUACOES = ['planejado', 'feito', 'nao_feito', 'parcial'] as const

// O atleta marca o treino como feito / não feito (porte de UpdateTrainingSessionStatusAction).
// Confere pela RLS que o treino é dele e está publicado; grava com o service role
// (o atleta não tem permissão de escrita direta nas tabelas de treino).
export async function marcarSituacao(sessaoId: string, situacao: (typeof SITUACOES)[number], obs?: string): Promise<{ error?: string }> {
  if (!SITUACOES.includes(situacao)) return { error: 'Situação inválida.' }
  const { db, atleta } = await atletaLogado()
  if (!atleta) return { error: 'Acesso desativado.' }
  const { data: s } = await db.from('treino_sessoes').select('id, titulo, data, turma_id, aluno_id').eq('id', sessaoId).eq('status', 'publicado').maybeSingle()
  if (!s || (s.aluno_id && s.aluno_id !== atleta.aluno.id)) return { error: 'Treino não encontrado.' }
  // Treino da turma com ajuste para este atleta: vale o ajuste.
  if (s.turma_id) {
    const { data: aj } = await db.from('treino_sessoes').select('id').eq('sessao_origem_id', s.id).eq('aluno_id', atleta.aluno.id).maybeSingle()
    if (aj) return { error: 'Este treino foi ajustado para você; abra a versão ajustada.' }
  }
  const admin = createAdminClient() as Db
  const { error } = await admin.from('treino_entregas').upsert({
    sessao_id: s.id, aluno_id: atleta.aluno.id, situacao,
    marcado_por: 'atleta', marcado_em: new Date().toISOString(), observacao_atleta: obs?.trim().slice(0, 500) || null,
  }, { onConflict: 'sessao_id,aluno_id' })
  if (error) return { error: 'Não foi possível salvar. Tente de novo.' }
  await logAudit({
    userId: atleta.userId, userName: atleta.aluno.nome, action: 'status', resource: 'portal',
    resourceId: s.id, resourceLabel: `${s.titulo} (${s.data}): ${situacao.replace('_', ' ')}`,
  })
  revalidatePath('/portal', 'layout')
  revalidatePath('/treinos', 'layout')
  return {}
}
