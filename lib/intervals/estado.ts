import 'server-only'
import { assinar, iguaisSeguro } from '@/lib/crypto'

// State do OAuth autocontido (sem sessão): base64url(JSON) + "." + HMAC,
// válido por 15 minutos — mesmo formato do IntervalsOAuthController do Movelly.

const segredo = () => {
  const s = process.env.INTERVALS_STATE_SECRET ?? process.env.INTERVALS_CLIENT_SECRET ?? process.env.INTERVALS_TOKEN_KEY
  if (!s) throw new Error('Sem segredo para assinar o state do Intervals.')
  return `intervals|${s}`
}

export function criarState(alunoId: string): string {
  const carga = Buffer.from(JSON.stringify({ a: alunoId, e: Date.now() + 15 * 60_000 })).toString('base64url')
  return `${carga}.${assinar(carga, segredo())}`
}

export function lerState(state: string): string | null {
  const [carga, sig] = state.split('.')
  if (!carga || !sig || !iguaisSeguro(assinar(carga, segredo()), sig)) return null
  try {
    const d = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { a?: string; e?: number }
    return d.a && d.e && d.e > Date.now() ? d.a : null
  } catch {
    return null
  }
}
