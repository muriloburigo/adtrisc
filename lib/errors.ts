type ErrorLike = { message?: string | null; code?: string | null } | Error | string | null | undefined

const DEFAULT_FALLBACK = 'Não foi possível concluir a ação. Tente novamente ou fale com um administrador.'

/** Traduz erros do Supabase/Postgres (RLS, auth) para mensagens que fazem sentido pro usuário final. */
export function friendlyError(error: ErrorLike, fallback: string = DEFAULT_FALLBACK): string {
  if (!error) return fallback

  const message = typeof error === 'string' ? error : error.message ?? ''
  const code = typeof error === 'string' ? undefined : ('code' in error ? error.code : undefined)

  if (code === '42501' || /row-level security policy/i.test(message) || /permission denied/i.test(message)) {
    return 'Você não tem permissão para realizar esta ação. Fale com um administrador.'
  }
  if (message === 'Acesso negado') {
    return 'Você não tem permissão para realizar esta ação.'
  }
  if (message === 'Não autenticado') {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  return fallback
}
