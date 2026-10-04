'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import PasswordInput from '@/components/ui/PasswordInput'
import { aceitarConvite } from './actions'

const input = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'

export default function ConviteForm({ token, tipo }: { token: string; tipo: 'criar' | 'senha' }) {
  const [state, action, pending] = useActionState(aceitarConvite.bind(null, token), null)
  const [modo, setModo] = useState<'usuario' | 'email'>('usuario')

  return (
    <form action={action} className="space-y-4">
      {tipo === 'criar' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Como você vai entrar?</p>
          <div className="grid grid-cols-2 rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(['usuario', 'email'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModo(m)}
                className={`py-2 ${modo === m ? 'bg-navy-500 text-white' : 'bg-white text-gray-500'}`}>{m === 'usuario' ? 'Nome de usuário' : 'E-mail'}</button>
            ))}
          </div>
          <input type="hidden" name="modo" value={modo} />
          <input name="login" required autoCapitalize="none" autoCorrect="off" className={input}
            type={modo === 'email' ? 'email' : 'text'} placeholder={modo === 'email' ? 'seu@email.com' : 'ex.: joao.silva'} />
          {modo === 'usuario' && <p className="text-[11px] text-gray-400">Letras minúsculas, números, ponto ou hífen. É com ele que você entra.</p>}
        </div>
      )}
      <PasswordInput name="senha" label={tipo === 'criar' ? 'Senha' : 'Nova senha'} required />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Repita a senha</label>
        <input name="confirmacao" type="password" required className={input} />
      </div>
      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input type="checkbox" name="aceite" required className="mt-0.5" />
        <span>Li e concordo com a <Link href="/politica" target="_blank" className="text-sky-600 underline">política de privacidade</Link> da ADTRISC. Se tenho menos de 18 anos, meu responsável está de acordo.</span>
      </label>
      {state?.error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      <button disabled={pending} className="w-full bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-xl py-3 disabled:opacity-50">
        {pending ? 'Salvando…' : tipo === 'criar' ? 'Criar meu acesso' : 'Salvar nova senha'}
      </button>
    </form>
  )
}
