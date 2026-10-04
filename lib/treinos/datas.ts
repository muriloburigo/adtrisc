// Datas do calendário de treinos (semana de segunda a domingo, como no Movelly).
// Trabalha com 'YYYY-MM-DD' no fuso de Brasília, sem horário.

export const hojeISO = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

const paraData = (iso: string) => new Date(`${iso}T12:00:00Z`)
const paraISO = (d: Date) => d.toISOString().slice(0, 10)

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso)
  d.setUTCDate(d.getUTCDate() + dias)
  return paraISO(d)
}

/** Segunda-feira da semana de `iso`. */
export function inicioSemana(iso: string): string {
  const dow = paraData(iso).getUTCDay() // 0 = domingo
  return somarDias(iso, dow === 0 ? -6 : 1 - dow)
}

export function diasDaSemana(iso: string): string[] {
  const seg = inicioSemana(iso)
  return Array.from({ length: 7 }, (_, i) => somarDias(seg, i))
}

/** Semanas (segunda a domingo) que cobrem o mês de `iso`. */
export function semanasDoMes(iso: string): string[][] {
  const primeiro = `${iso.slice(0, 7)}-01`
  const d = paraData(primeiro)
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  const ultimo = paraISO(d)
  const semanas: string[][] = []
  for (let seg = inicioSemana(primeiro); seg <= ultimo; seg = somarDias(seg, 7)) semanas.push(diasDaSemana(seg))
  return semanas
}

export function mesAnterior(iso: string, delta = -1): string {
  const d = paraData(`${iso.slice(0, 7)}-01`)
  d.setUTCMonth(d.getUTCMonth() + delta)
  return paraISO(d)
}

export const NOMES_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function rotuloMes(iso: string): string {
  const s = paraData(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
