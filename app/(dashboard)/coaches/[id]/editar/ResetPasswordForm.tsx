'use client'

import { useActionState } from 'react'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { resetPassword } from '../../actions'

export default function ResetPasswordForm({ coachId }: { coachId: string }) {
  const reset = resetPassword.bind(null, coachId)
  const [state, formAction, isPending] = useActionState(reset, null)

  return (
    <form action={formAction} className="space-y-4">
      <PasswordInput name="password" label="Nova senha" required />

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Redefinir senha'}
      </Button>
    </form>
  )
}
