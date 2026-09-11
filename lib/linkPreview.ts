// Busca um preview reduzido (título, descrição, imagem) de uma URL pública,
// lendo as tags Open Graph / meta tags da página. Usado pela área de
// Imprensa para mostrar uma prévia do link sem precisar embutir a página.

import dns from 'node:dns/promises'

export type LinkPreview = {
  titulo: string | null
  descricao: string | null
  imagem_url: string | null
  site: string
}

/**
 * Deriva um título legível a partir do slug da URL (último segmento do path
 * que não seja puramente numérico), para quando o fetch da página falha.
 * Ex: /sofia-gelati-e-campea-brasileira-de-triathlon/106133/ -> "Sofia gelati e campea brasileira de triathlon"
 */
export function titleFromSlug(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean)
  const slug = [...segments].reverse().find((s) => !/^\d+$/.test(s))
  if (!slug || slug.length < 4) return null

  const words = decodeURIComponent(slug).replace(/[-_]+/g, ' ').trim()
  if (!words || !/[a-zA-Z]/.test(words)) return null

  return words.charAt(0).toUpperCase() + words.slice(1)
}

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, // link-local / cloud metadata
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
]

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return true // não parseou como IPv4 — trata como suspeito, não deixa passar
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)!
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (n & mask) === (b & mask)
  }
  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) || // link-local / cloud metadata (169.254.169.254)
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16)
  )
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower.startsWith('fe80:')) return true // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true // fc00::/7 (unique local)
  const mapped = lower.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  return false
}

/**
 * Resolve o hostname via DNS e confere se algum IP resolvido é privado/
 * loopback/link-local — bloqueia SSRF via domínio que aponta pra rede
 * interna ou metadata de cloud (ex: 169.254.169.254), o que o simples
 * regex de hostname (abaixo) não pega. Chamado antes de CADA request,
 * inclusive em cada hop de redirecionamento.
 */
async function assertPublicHost(url: URL): Promise<void> {
  let addresses: { address: string; family: number }[]
  try {
    addresses = await dns.lookup(url.hostname, { all: true, verbatim: true })
  } catch {
    throw new Error('Não foi possível resolver este endereço.')
  }
  if (addresses.length === 0) throw new Error('Não foi possível resolver este endereço.')
  for (const { address, family } of addresses) {
    const isPrivate = family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address)
    if (isPrivate) throw new Error('Este endereço não pode ser usado.')
  }
}

function extractMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${key}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${key}["']`, 'i'),
    ]
    for (const re of patterns) {
      const match = html.match(re)
      if (match?.[1]) return decodeHtmlEntities(match[1].trim())
    }
  }
  return null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

/** Valida formato/protocolo da URL. Lança erro de input inválido (bloqueia o cadastro). */
export function validateUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('URL inválida.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Apenas links http/https são aceitos.')
  }
  if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(url.hostname))) {
    throw new Error('Este endereço não pode ser usado.')
  }
  return url
}

/**
 * Busca o preview de uma URL já validada (ver validateUrl). Pode lançar erro
 * de rede/bloqueio (site fora do ar, proteção anti-bot, timeout etc.) —
 * chamadores devem tratar isso como "sem preview", não como input inválido.
 */
export async function fetchLinkPreview(url: URL): Promise<LinkPreview> {
  // redirect: 'manual' + revalidação a cada hop — um 1º hop pra um host público
  // que redireciona pra um IP interno também precisa ser barrado, não só a URL
  // original (senão assertPublicHost() na primeira URL não adianta nada).
  let current = url
  let res: Response
  for (let hop = 0; ; hop++) {
    if (hop > 5) throw new Error('Muitos redirecionamentos.')
    await assertPublicHost(current)
    res = await fetch(current.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ADTRISCBot/1.0; +https://adtrisc.vercel.app)',
        Accept: 'text/html',
      },
    })
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) break
    try {
      current = validateUrl(new URL(location, current).toString())
    } catch {
      throw new Error('Redirecionamento inválido.')
    }
  }
  url = current

  if (!res.ok) throw new Error(`Não foi possível acessar o link (HTTP ${res.status}).`)

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) throw new Error('O link não aponta para uma página HTML.')

  // Lê só o começo da resposta — as meta tags relevantes ficam no <head>.
  const reader = res.body?.getReader()
  let html = ''
  if (reader) {
    const decoder = new TextDecoder()
    const MAX_BYTES = 500_000
    let received = 0
    while (received < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      html += decoder.decode(value, { stream: true })
    }
    reader.cancel().catch(() => {})
  } else {
    html = await res.text()
  }

  const titulo = extractMeta(html, ['og:title', 'twitter:title']) ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null
  const descricao = extractMeta(html, ['og:description', 'twitter:description', 'description'])
  let imagem = extractMeta(html, ['og:image', 'twitter:image'])
  if (imagem) {
    try {
      imagem = new URL(imagem, url).toString()
    } catch {
      imagem = null
    }
  }
  const siteName = extractMeta(html, ['og:site_name'])

  return {
    titulo: titulo ? decodeHtmlEntities(titulo) : null,
    descricao,
    imagem_url: imagem,
    site: siteName ?? url.hostname.replace(/^www\./, ''),
  }
}
