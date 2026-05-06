import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DiaSemana } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function calcularIdade(dataNascimento: string | Date): number {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

const DIAS_LABEL: Record<DiaSemana, string> = {
  seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui',
  sex: 'Sex', sab: 'Sáb', dom: 'Dom',
}

export function formatarDiaSemana(dia: DiaSemana): string {
  return DIAS_LABEL[dia]
}

export function formatarHorario(time: string): string {
  return time.slice(0, 5)
}

export function formatarDiasSemana(dias: DiaSemana[]): string {
  return dias.map(formatarDiaSemana).join(', ')
}

export function formatFaixaEtaria(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${min}–${max} anos`
  if (min != null) return `a partir de ${min} anos`
  if (max != null) return `até ${max} anos`
  return null
}

export function formatSemestre(semestre: number | null): string | null {
  if (semestre === 1) return '1º Semestre'
  if (semestre === 2) return '2º Semestre'
  return null
}

export function mmssToSeconds(value: string): number | null {
  const match = value.trim().match(/^(\d{1,3}):([0-5]\d)(?:\.(\d{1,2}))?$/)
  if (!match) return null
  const min = parseInt(match[1], 10)
  const sec = parseInt(match[2], 10)
  const cs  = match[3] ? parseInt(match[3].padEnd(2, '0'), 10) : 0
  return min * 60 + sec + cs / 100
}

export function secondsToMmss(total: number): string {
  const floored = Math.floor(total)
  const cs  = Math.round((total - floored) * 100)
  const min = Math.floor(floored / 60)
  const sec = floored % 60
  const base = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return cs > 0 ? `${base}.${String(cs).padStart(2, '0')}` : base
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador(a)',
  coach: 'Treinador(a)',
  aluno: 'Atleta',
  pai: 'Responsável',
}
export function formatRole(role: string): string {
  return ROLE_LABEL[role] ?? role
}
