// Comparação de nomes de atletas para evitar cadastro duplicado. Ignora
// acentuação, maiúsculas, espaços extras, pontuação e partículas (de, da, do...),
// e aceita abreviações ("M." = "Maria") e nome do meio faltando.
// Ex.: "Maitê de Moraes Matzenbacher" = "Maite de Moraes Matzenbacher".

const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e'])

export function tokensNome(nome: string): string[] {
  return nome
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !PARTICULAS.has(t))
}

// "m" (abreviação) casa com qualquer nome começando por m.
const casa = (a: string, b: string) => a === b || (a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))
const contido = (a: string[], b: string[]) => a.every((t) => b.some((u) => casa(t, u)))

export type Motivo = 'nome igual' | 'nome parecido' | 'nome parecido e mesma data de nascimento'

/**
 * Diz se dois cadastros parecem ser a mesma pessoa. `null` = pessoas diferentes.
 * Mesmos critérios da varredura que achou a Maitê duplicada em 30/09/2026.
 */
export function mesmaPessoa(
  a: { nome: string; data_nascimento?: string | null },
  b: { nome: string; data_nascimento?: string | null },
): Motivo | null {
  const A = tokensNome(a.nome)
  const B = tokensNome(b.nome)
  if (!A.length || !B.length) return null
  if (A.join(' ') === B.join(' ')) return 'nome igual'

  const primeiro = casa(A[0], B[0])
  const ultimo = A[A.length - 1] === B[B.length - 1]
  const umContemOutro = contido(A, B) || contido(B, A)
  const mesmaData = !!a.data_nascimento && a.data_nascimento === b.data_nascimento

  if (primeiro && mesmaData && (ultimo || umContemOutro)) return 'nome parecido e mesma data de nascimento'
  if (primeiro && ultimo && umContemOutro) return 'nome parecido'
  return null
}
