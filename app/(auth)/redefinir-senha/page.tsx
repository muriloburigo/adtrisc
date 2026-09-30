'use client'

import { useActionState } from 'react'
import PasswordInput from '@/components/ui/PasswordInput'
import AuthCard from '../AuthCard'
import { definirNovaSenha, type RedefinirState } from './actions'

export default function RedefinirSenhaPage() {
  const [state, action, pending] = useActionState<RedefinirState, FormData>(definirNovaSenha, null)

  return (
    <AuthCard titulo="Criar nova senha">
      <form action={action} className="space-y-4">
        <PasswordInput name="nova_senha" label="Nova senha" required />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Repita a nova senha<span className="text-red-500 ml-0.5">*</span></label>
          <input
            name="confirmacao"
            type="password"
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
          />
        </div>
        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-navy-500 hover:bg-sky-400 transition-colors disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthCard>
  )
}
