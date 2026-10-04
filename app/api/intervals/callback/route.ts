import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escoposFaltando, trocarCodigo } from '@/lib/intervals/client'
import { lerState } from '@/lib/intervals/estado'
import { enviarFuturos, importarAtividades, salvarConexao } from '@/lib/intervals/sync'
import { logAudit } from '@/lib/audit'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Callback do app OAuth "ADTRISC" (cadastrado no Intervals.icu). Porte de
// IntervalsOAuthController::callback + ConnectIntervalsAction do Movelly.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const volta = (q: string) => NextResponse.redirect(new URL(`/portal/conta?intervals=${q}`, req.url))
  const code = url.searchParams.get('code') ?? ''
  const alunoId = lerState(url.searchParams.get('state') ?? '')
  if (url.searchParams.get('error') || !code) return volta('cancelado')
  if (!alunoId) return volta('expirado')

  // Quem volta do Intervals tem de ser o próprio atleta logado (o state é dele).
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  const { data: a } = user ? await db.from('alunos').select('id, nome').eq('id', alunoId).eq('profile_id', user.id).maybeSingle() : { data: null }
  if (!a) return volta('erro')

  const r = await trocarCodigo(code)
  if (!r.ok || !r.data?.access_token || r.data.athlete?.id == null) return volta('erro')
  if (escoposFaltando(r.data.scope ?? '').length) return volta('escopo')

  const erro = await salvarConexao(a.id, String(r.data.athlete.id), r.data.access_token, r.data.scope ?? null)
  if (erro) return volta('erro')
  await logAudit({ userId: user!.id, userName: a.nome, action: 'criar', resource: 'portal', resourceId: a.id, resourceLabel: 'Conectou o Intervals.icu' })
  // Traz o histórico recente e manda os treinos já publicados, sem esperar o webhook.
  after(async () => { await importarAtividades(a.id, 14); await enviarFuturos(a.id) })
  return volta('ok')
}
