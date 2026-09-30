'use client'

import { useActionState, useEffect, useRef } from 'react'
import PasswordInput from '@/components/ui/PasswordInput'
import Button from '@/components/ui/Button'
import { alterarMinhaSenha, type TrocaSenhaState } from './actions'

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent'
const labelClass = 'text-sm font-medium text-gray-700'

export default function TrocarSenhaForm() {
  const [state, action, pending] = useActionState<TrocaSenhaState, FormData>(alterarMinhaSenha, null)
  const form = useRef<HTMLFormElement>(null)

  useEffect(() => { if (state?.ok) form.current?.reset() }, [state])

  return (
    <form ref={form} action={action} className="space-y-4 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Senha atual<span className="text-red-500 ml-0.5">*</span></label>
        <input name="senha_atual" type="password" required autoComplete="current-password" className={inputClass} />
      </div>
      <PasswordInput key={state?.ok ? 'limpo' : 'nova'} name="nova_senha" label="Nova senha" required />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Repita a nova senha<span className="text-red-500 ml-0.5">*</span></label>
        <input name="confirmacao" type="password" required autoComplete="new-password" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-600">Senha alterada. Use a nova senha no próximo acesso.</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Alterar senha'}</Button>
    </form>
  )
}
