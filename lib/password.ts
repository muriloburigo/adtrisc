export const PASSWORD_REQUIREMENTS = [
  { label: 'Pelo menos 8 caracteres',       test: (p: string) => p.length >= 8 },
  { label: 'Uma letra maiúscula (A–Z)',      test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Uma letra minúscula (a–z)',      test: (p: string) => /[a-z]/.test(p) },
  { label: 'Um número (0–9)',                test: (p: string) => /[0-9]/.test(p) },
  { label: 'Um caractere especial (!@#$…)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const

export function validatePassword(password: string): string | null {
  for (const { label, test } of PASSWORD_REQUIREMENTS) {
    if (!test(password)) return `Requisito não atendido: ${label.toLowerCase()}.`
  }
  return null
}
