import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { removerEventos, sincronizarSessao } from './sync'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

async function alguemConectado(db: Db) {
  const { count } = await db.from('intervals_conexoes').select('id', { count: 'exact', head: true })
  return (count ?? 0) > 0
}

/**
 * Depois da resposta, deixa o Intervals igual às sessões alteradas. Inclui os
 * ajustes delas e as sessões de origem (publicar um ajuste tira o treino da
 * turma do Intervals daquele atleta; apagar o ajuste devolve).
 */
export function sincronizarDepois(ids: (string | null | undefined)[]) {
  const base = [...new Set(ids.filter((x): x is string => Boolean(x)))]
  if (!base.length) return
  after(async () => {
    const db = createAdminClient() as Db
    if (!(await alguemConectado(db))) return
    const [{ data: origens }, { data: ajustes }] = await Promise.all([
      db.from('treino_sessoes').select('sessao_origem_id').in('id', base).not('sessao_origem_id', 'is', null),
      db.from('treino_sessoes').select('id').in('sessao_origem_id', base),
    ])
    const todos = new Set([...base, ...((origens ?? []) as { sessao_origem_id: string }[]).map((o) => o.sessao_origem_id), ...((ajustes ?? []) as { id: string }[]).map((a) => a.id)])
    for (const id of todos) await sincronizarSessao(id)
  })
}

/** Antes de apagar: tira os eventos (as entregas somem em cascata com a sessão). */
export async function removerAntesDeApagar(ids: string[]) {
  const db = createAdminClient() as Db
  if (await alguemConectado(db)) await removerEventos(ids)
}
