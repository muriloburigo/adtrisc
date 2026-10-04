// Portal do atleta — login por e-mail OU por nome de usuário.
// Sem e-mail, a conta usa o endereço interno <usuario>@atleta.adtrisc.invalid
// (".invalid" é reservado pela RFC 2606: nunca recebe e-mail). O login aceita
// só o usuário e completa o domínio.

export const DOMINIO_ATLETA = 'atleta.adtrisc.invalid'

/** Normaliza o que foi digitado no login (e-mail ou usuário) para o e-mail da conta. */
export function loginParaEmail(entrada: string): string {
  const s = entrada.trim().toLowerCase()
  return s.includes('@') ? s : `${s}@${DOMINIO_ATLETA}`
}

/** Para mostrar: o usuário (sem o domínio interno) ou o e-mail de verdade. */
export function loginDeExibicao(email: string | null | undefined): string {
  if (!email) return ''
  return email.endsWith(`@${DOMINIO_ATLETA}`) ? email.slice(0, -DOMINIO_ATLETA.length - 1) : email
}

export function validarUsuario(u: string): string | null {
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(u)) return 'O usuário precisa ter de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'
  return null
}

export function validarEmail(e: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'E-mail inválido.'
  if (e.endsWith(`@${DOMINIO_ATLETA}`)) return 'Use a opção “nome de usuário”.'
  return null
}

export function toWaNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  return d.startsWith('55') && d.length >= 12 ? d : `55${d}`
}
