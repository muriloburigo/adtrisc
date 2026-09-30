'use client'

import { useActionState } from 'react'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'

export type ResetPasswordState = { error: string } | { done: true } | null

// Admin define uma nova senha para outra conta (Treinadores e Configurações).
// `action` é a server action já ligada ao id do usuário (`acao.bind(null, id)`).
export default function ResetPasswordForm({
  action,
}: {
  action: (prev: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>
}) {
  const [state, formAction, isPending] = useActionState(action, null)
  const error = state && 'error' in state ? state.error : null
  const ok = state && 'done' in state

  return (
    <form action={formAction} className="space-y-4">
      <PasswordInput key={ok ? 'ok' : 'form'} name="password" label="Nova senha" required />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      {ok && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          Senha redefinida. Passe a nova senha para a pessoa; ela pode trocá-la depois em &quot;Minha conta&quot;.
        </p>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Redefinir senha'}
      </Button>
    </form>
  )
}
