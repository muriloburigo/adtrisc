import { NextResponse, after } from 'next/server'
import { iguaisSeguro } from '@/lib/crypto'
import { alunosDoAtletaIcu, apagarConexao, importarAtividades, removerAtividade } from '@/lib/intervals/sync'
import { createAdminClient } from '@/lib/supabase/admin'

// Webhooks do app OAuth do Intervals.icu: {secret?, events: [{athlete_id, type, ...}]}.
// Autenticado pelo header Authorization cadastrado no app (INTERVALS_WEBHOOK_SECRET)
// ou pelo campo `secret` do corpo (INTERVALS_WEBHOOK_PAYLOAD_SECRET). Responde
// rápido; o trabalho roda em after(). Porte de IntervalsWebhookController.

const ATIVIDADE = ['ACTIVITY_UPLOADED', 'ACTIVITY_ANALYZED', 'ACTIVITY_UPDATED']

function autorizado(req: Request, corpo: { secret?: unknown }) {
  const s = process.env.INTERVALS_WEBHOOK_SECRET ?? ''
  const h = req.headers.get('authorization') ?? ''
  if (s && h && (iguaisSeguro(h, s) || iguaisSeguro(h, `Bearer ${s}`))) return true
  const ps = process.env.INTERVALS_WEBHOOK_PAYLOAD_SECRET ?? ''
  return Boolean(ps) && typeof corpo.secret === 'string' && iguaisSeguro(corpo.secret, ps)
}

type Evento = { athlete_id?: string | number; type?: string; activity?: { id?: string | number }; activity_id?: string | number; scope?: string; deauthorized?: boolean }

export async function POST(req: Request) {
  let corpo: { secret?: unknown; events?: Evento[] }
  try { corpo = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  if (!autorizado(req, corpo)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sincronizar = new Set<string>()
  const tarefas: (() => Promise<void>)[] = []
  for (const ev of Array.isArray(corpo.events) ? corpo.events : []) {
    const atleta = ev.athlete_id == null ? '' : String(ev.athlete_id)
    if (!atleta) continue
    if (ATIVIDADE.includes(ev.type ?? '')) { sincronizar.add(atleta); continue }
    if (ev.type === 'ACTIVITY_DELETED') {
      const id = ev.activity?.id ?? ev.activity_id
      if (id != null) tarefas.push(() => removerAtividade(atleta, String(id)))
      continue
    }
    if (ev.type === 'APP_SCOPE_CHANGED') {
      const revogado = Boolean(ev.deauthorized) || ('scope' in ev && !ev.scope)
      tarefas.push(async () => {
        for (const aluno of await alunosDoAtletaIcu(atleta)) {
          if (revogado) await apagarConexao(aluno, false)
          else if (ev.scope) await (createAdminClient() as any).from('intervals_conexoes').update({ escopo: ev.scope }).eq('aluno_id', aluno) // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      })
      continue
    }
    console.info('[intervals webhook] evento ignorado', ev.type, atleta) // CALENDAR_UPDATED etc.
  }
  for (const atleta of sincronizar) tarefas.push(async () => { for (const aluno of await alunosDoAtletaIcu(atleta)) await importarAtividades(aluno, 3) })
  after(async () => { for (const t of tarefas) { try { await t() } catch (e) { console.error('[intervals webhook]', e) } } })
  return NextResponse.json({ ok: true })
}
