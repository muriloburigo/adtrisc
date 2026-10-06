import 'server-only'

// Cliente da API do Intervals.icu — porte de IntervalsIcuClient do Movelly.
// Cada atleta autoriza o app OAuth "ADTRISC"; o token (Bearer) não expira.
// Em desenvolvimento dá para testar sem o OAuth com a API key pessoal
// (INTERVALS_DEV_API_KEY + INTERVALS_DEV_ATHLETE_ID): o "token" guardado é
// o marcador DEV_TOKEN e as chamadas usam Basic auth com a chave.

export const DEV_TOKEN = 'dev-api-key'
export const ESCOPOS = 'CALENDAR:WRITE,ACTIVITY:READ'

export type Resposta<T = unknown> = { ok: true; data: T } | { ok: false; error: string; status?: number }

const base = () => (process.env.INTERVALS_BASE_URL ?? 'https://intervals.icu').replace(/\/$/, '')
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://adtrisc.vercel.app').replace(/\/$/, '')
export const redirectUri = () => `${appUrl()}/api/intervals/callback`

export const oauthLigado = () => Boolean(process.env.INTERVALS_CLIENT_ID && process.env.INTERVALS_CLIENT_SECRET && process.env.INTERVALS_TOKEN_KEY)
export const modoDev = () => process.env.NODE_ENV !== 'production' && Boolean(process.env.INTERVALS_DEV_API_KEY && process.env.INTERVALS_DEV_ATHLETE_ID)

export function urlAutorizacao(state: string): string {
  const q = new URLSearchParams({ client_id: process.env.INTERVALS_CLIENT_ID ?? '', redirect_uri: redirectUri(), scope: ESCOPOS, state })
  return `${base()}/oauth/authorize?${q}`
}

async function enviar<T>(metodo: string, caminho: string, init: { headers?: Record<string, string>; body?: BodyInit } = {}): Promise<Resposta<T>> {
  try {
    const r = await fetch(`${base()}${caminho}`, { method: metodo, headers: init.headers, body: init.body, signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    const texto = await r.text()
    if (!r.ok) {
      console.error('[intervals]', metodo, caminho, r.status, texto.slice(0, 300))
      return { ok: false, status: r.status, error: `Intervals.icu respondeu ${r.status}.` }
    }
    return { ok: true, data: (texto ? JSON.parse(texto) : null) as T }
  } catch (e) {
    console.error('[intervals]', metodo, caminho, e)
    return { ok: false, error: 'Não foi possível falar com o Intervals.icu.' }
  }
}

function autorizacao(token: string): string {
  if (token === DEV_TOKEN) return `Basic ${Buffer.from(`API_KEY:${process.env.INTERVALS_DEV_API_KEY ?? ''}`).toString('base64')}`
  return `Bearer ${token}`
}

function comToken<T>(token: string, metodo: string, caminho: string, corpo?: unknown) {
  const headers: Record<string, string> = { Authorization: autorizacao(token), Accept: 'application/json' }
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  return enviar<T>(metodo, caminho, { headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) })
}

export type TokenOAuth = { access_token: string; scope?: string; athlete?: { id?: string | number; name?: string } }

export function trocarCodigo(code: string) {
  const body = new URLSearchParams({ client_id: process.env.INTERVALS_CLIENT_ID ?? '', client_secret: process.env.INTERVALS_CLIENT_SECRET ?? '', code })
  return enviar<TokenOAuth>('POST', '/api/oauth/token', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
}

export const desconectarApp = (token: string) => (token === DEV_TOKEN ? Promise.resolve({ ok: true, data: null } as Resposta) : comToken(token, 'DELETE', '/api/v1/disconnect-app'))
export const criarEvento = (token: string, atleta: string, evento: unknown) => comToken<{ id: number | string }>(token, 'POST', `/api/v1/athlete/${atleta}/events`, evento)
export const atualizarEvento = (token: string, atleta: string, id: string, evento: unknown) => comToken<{ id: number | string }>(token, 'PUT', `/api/v1/athlete/${atleta}/events/${id}`, evento)
export const apagarEvento = (token: string, atleta: string, id: string) => comToken(token, 'DELETE', `/api/v1/athlete/${atleta}/events/${id}`)
export const atividades = (token: string, atleta: string, de: string, ate: string) =>
  comToken<Record<string, unknown>[]>(token, 'GET', `/api/v1/athlete/${atleta}/activities?${new URLSearchParams({ oldest: de, newest: ate })}`)

/** Escopos pedidos que o atleta não concedeu (no Intervals, WRITE implica READ). */
export function escoposFaltando(concedido: string): string[] {
  const nivel: Record<string, string> = {}
  for (const item of concedido.toUpperCase().split(',').map((s) => s.trim()).filter(Boolean)) {
    const [area, n = 'READ'] = item.split(':')
    nivel[area] = nivel[area] === 'WRITE' ? 'WRITE' : n
  }
  return ESCOPOS.split(',').filter((req) => {
    const [area, n] = req.split(':')
    return !nivel[area] || (n === 'WRITE' && nivel[area] !== 'WRITE')
  })
}

/** Voltas/tiros detectados pelo Intervals (IntervalsDTO.icu_intervals). */
export const voltasDaAtividade = (token: string, atividadeId: string) =>
  comToken<{ icu_intervals?: unknown[] }>(token, 'GET', `/api/v1/activity/${encodeURIComponent(atividadeId)}/intervals`)
