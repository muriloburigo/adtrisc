import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

// Execuções (o que foi feito) — vincular a um treino marca "feito" (automático);
// desvincular/apagar volta a "planejado" se o "feito" tinha sido automático.
// Porte de LinkStravaActivityAction / UnlinkStravaActivityAction e do
// tratamento de atividades extras do Movelly. Sempre com o service role:
// quem chama já conferiu (pela RLS) que pode mexer naquele atleta/treino.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

async function entregaPara(db: Db, sessaoId: string, alunoId: string): Promise<string | null> {
  const agora = new Date().toISOString()
  const { data: e } = await db.from('treino_entregas').select('id, situacao').eq('sessao_id', sessaoId).eq('aluno_id', alunoId).maybeSingle()
  if (e) {
    if (e.situacao === 'planejado') await db.from('treino_entregas').update({ situacao: 'feito', marcado_por: 'auto', marcado_em: agora }).eq('id', e.id)
    return e.id
  }
  const { data: n } = await db.from('treino_entregas').insert({ sessao_id: sessaoId, aluno_id: alunoId, situacao: 'feito', marcado_por: 'auto', marcado_em: agora }).select('id').single()
  return n?.id ?? null
}

async function liberarEntrega(db: Db, entregaId: string | null) {
  if (!entregaId) return
  const { count } = await db.from('treino_execucoes').select('id', { count: 'exact', head: true }).eq('entrega_id', entregaId)
  if (!count) await db.from('treino_entregas').update({ situacao: 'planejado', marcado_por: null, marcado_em: null }).eq('id', entregaId).eq('marcado_por', 'auto')
}

/** Sessão já tem uma execução deste atleta? (cada treino recebe uma só) */
export async function sessaoOcupada(sessaoId: string, alunoId: string): Promise<boolean> {
  const db = createAdminClient() as Db
  const { data } = await db.from('treino_execucoes').select('id, treino_entregas!inner(sessao_id)').eq('aluno_id', alunoId).eq('treino_entregas.sessao_id', sessaoId).limit(1)
  return Boolean(data?.length)
}

export async function registrarExecucao(alunoId: string, sessaoId: string | null, dados: Record<string, unknown>): Promise<{ error?: string; id?: string }> {
  const db = createAdminClient() as Db
  const entrega_id = sessaoId ? await entregaPara(db, sessaoId, alunoId) : null
  const { data, error } = await db.from('treino_execucoes').insert({ ...dados, aluno_id: alunoId, entrega_id }).select('id').single()
  if (error) return { error: error.code === '23505' ? 'Essa atividade já foi enviada.' : 'Não foi possível salvar a atividade.' }
  return { id: data.id }
}

export async function vincular(execId: string, sessaoId: string): Promise<{ error?: string }> {
  const db = createAdminClient() as Db
  const { data: ex } = await db.from('treino_execucoes').select('id, aluno_id, entrega_id').eq('id', execId).maybeSingle()
  if (!ex) return { error: 'Atividade não encontrada.' }
  if (await sessaoOcupada(sessaoId, ex.aluno_id)) return { error: 'Esse treino já tem uma atividade vinculada.' }
  const entrega = await entregaPara(db, sessaoId, ex.aluno_id)
  await db.from('treino_execucoes').update({ entrega_id: entrega }).eq('id', execId)
  await liberarEntrega(db, ex.entrega_id)
  return {}
}

export async function desvincular(execId: string): Promise<{ error?: string }> {
  const db = createAdminClient() as Db
  const { data: ex } = await db.from('treino_execucoes').select('entrega_id').eq('id', execId).maybeSingle()
  if (!ex) return { error: 'Atividade não encontrada.' }
  await db.from('treino_execucoes').update({ entrega_id: null }).eq('id', execId)
  await liberarEntrega(db, ex.entrega_id)
  return {}
}

export async function apagarExecucao(execId: string): Promise<{ error?: string }> {
  const db = createAdminClient() as Db
  const { data: ex } = await db.from('treino_execucoes').delete().eq('id', execId).select('entrega_id, arquivo_fit').maybeSingle()
  if (!ex) return { error: 'Atividade não encontrada.' }
  if (ex.arquivo_fit) await db.storage.from('treinos-fit').remove([ex.arquivo_fit])
  await liberarEntrega(db, ex.entrega_id)
  return {}
}

/** Mover uma atividade extra de dia (ex.: relógio com data errada). */
export async function moverExtra(execId: string, data: string): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: 'Data inválida.' }
  const db = createAdminClient() as Db
  const { data: ex } = await db.from('treino_execucoes').select('executado_em, entrega_id').eq('id', execId).maybeSingle()
  if (!ex) return { error: 'Atividade não encontrada.' }
  if (ex.entrega_id) return { error: 'Desvincule a atividade do treino antes de mover.' }
  const hora = new Date(ex.executado_em).toLocaleTimeString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  await db.from('treino_execucoes').update({ executado_em: `${data}T${hora}-03:00` }).eq('id', execId)
  return {}
}
