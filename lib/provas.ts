import type { EtapaModalidade, EtapaProva } from '@/types/database'

export const ETAPA_MODALIDADE_LABEL: Record<EtapaModalidade, string> = {
  natacao: 'Natação',
  ciclismo: 'Ciclismo',
  corrida: 'Corrida',
}

export const ETAPA_MODALIDADE_OPTIONS: { value: EtapaModalidade; label: string }[] = [
  { value: 'natacao', label: 'Natação' },
  { value: 'ciclismo', label: 'Ciclismo' },
  { value: 'corrida', label: 'Corrida' },
]

export function formatDistancia(metros: number): string {
  if (metros >= 1000) {
    const km = metros / 1000
    return `${Number.isInteger(km) ? km : km.toFixed(1)}km`
  }
  return `${metros}m`
}

export function formatEtapas(etapas: EtapaProva[]): string {
  if (!etapas || etapas.length === 0) return '—'
  return etapas
    .map((e) => `${ETAPA_MODALIDADE_LABEL[e.modalidade]} ${formatDistancia(e.distancia_metros)}`)
    .join(' → ')
}

export function statusProva(data: string): 'agendada' | 'realizada' {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const d = new Date(data.includes('T') ? data : data + 'T12:00:00')
  return d >= hoje ? 'agendada' : 'realizada'
}
