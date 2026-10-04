import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// AES-256-GCM para segredos guardados no banco (token do Intervals.icu).
// Chave: INTERVALS_TOKEN_KEY = 32 bytes em base64 (`openssl rand -base64 32`).
// Formato: v1.<iv>.<tag>.<cifra> (base64url).

function chave(): Buffer {
  const k = Buffer.from(process.env.INTERVALS_TOKEN_KEY ?? '', 'base64')
  if (k.length !== 32) throw new Error('INTERVALS_TOKEN_KEY ausente ou inválida (precisa de 32 bytes em base64).')
  return k
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave(), iv)
  const cifra = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), cifra.toString('base64url')].join('.')
}

export function decifrar(valor: string): string {
  const [v, iv, tag, cifra] = valor.split('.')
  if (v !== 'v1' || !iv || !tag || !cifra) throw new Error('Formato de segredo desconhecido.')
  const d = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64url'))
  d.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([d.update(Buffer.from(cifra, 'base64url')), d.final()]).toString('utf8')
}

/** HMAC-SHA256 em base64url (assinatura de state do OAuth etc.). */
export function assinar(texto: string, segredo: string): string {
  return createHmac('sha256', segredo).update(texto).digest('base64url')
}

export function iguaisSeguro(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
