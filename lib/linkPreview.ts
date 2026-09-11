// Busca um preview reduzido (título, descrição, imagem) de uma URL pública,
// lendo as tags Open Graph / meta tags da página. Usado pela área de
// Imprensa para mostrar uma prévia do link sem precisar embutir a página.

export type LinkPreview = {
  titulo: string | null
  descricao: string | null
  imagem_url: string | null
  site: string
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

export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
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

  const res = await fetch(url.toString(), {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ADTRISCBot/1.0; +https://adtrisc.vercel.app)',
      Accept: 'text/html',
    },
  })

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
