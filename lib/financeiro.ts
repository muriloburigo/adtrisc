export function percentConsumido(consumido: number, orcado: number): number {
  if (orcado <= 0) return consumido > 0 ? 100 : 0
  return Math.min(100, Math.round((consumido / orcado) * 100))
}

export function progressoBarColor(consumido: number, orcado: number): string {
  if (orcado > 0 && consumido > orcado) return 'bg-brand-red-500'
  const pct = orcado > 0 ? (consumido / orcado) * 100 : 0
  if (pct >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export const NOTA_FISCAL_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'
export const NOTA_FISCAL_TIPOS_VALIDOS = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
])
export const NOTA_FISCAL_MAX_BYTES = 10 * 1024 * 1024
