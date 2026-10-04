import { NextResponse } from 'next/server'
import { iguaisSeguro } from '@/lib/crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { importarAtividades, sincronizarSessao } from '@/lib/intervals/sync'
import { hojeISO } from '@/lib/treinos/datas'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
export const maxDuration = 300

// Rede de segurança diária (vercel.json → crons): importa as atividades dos
// últimos 2 dias de cada atleta conectado (caso um webhook tenha se perdido)
// e reenvia os treinos futuros cujo envio falhou.
export async function GET(req: Request) {
  const s = process.env.CRON_SECRET ?? ''
  if (!s || !iguaisSeguro(req.headers.get('authorization') ?? '', `Bearer ${s}`)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = createAdminClient() as Db
  const { data: cs } = await db.from('intervals_conexoes').select('aluno_id')
  let atividades = 0, reenvios = 0
  for (const { aluno_id } of (cs ?? []) as { aluno_id: string }[]) atividades += (await importarAtividades(aluno_id, 2)).novas
  const { data: falhas } = await db.from('treino_entregas').select('sessao_id, aluno_id, treino_sessoes!inner(data)').not('erro_envio', 'is', null).gte('treino_sessoes.data', hojeISO()).limit(200)
  for (const f of (falhas ?? []) as { sessao_id: string; aluno_id: string }[]) { await sincronizarSessao(f.sessao_id, f.aluno_id); reenvios++ }
  return NextResponse.json({ ok: true, atletas: cs?.length ?? 0, atividades, reenvios })
}
