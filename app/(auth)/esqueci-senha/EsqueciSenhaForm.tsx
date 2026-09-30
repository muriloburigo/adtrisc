'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { solicitarRedefinicao, type PedidoState } from './actions'

export default function EsqueciSenhaForm({ linkInvalido }: { linkInvalido: boolean }) {
  const [state, action, pending] = useActionState<PedidoState, FormData>(solicitarRedefinicao, null)

  return (
    <>
      {state?.enviado ? (
        <p className="text-sm text-gray-600 text-center">
          Se este e-mail estiver cadastrado, você vai receber em alguns minutos um link para criar uma nova senha.
          Confira também a caixa de spam. O link vale por 1 hora.
        </p>
      ) : (
        <form action={action} className="space-y-4">
          {linkInvalido && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              O link expirou ou já foi usado. Peça um novo abaixo.
            </p>
          )}
          <p className="text-sm text-gray-500">Informe o e-mail que você usa para entrar no sistema.</p>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
          {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-navy-500 hover:bg-sky-400 transition-colors disabled:opacity-60"
          >
            {pending ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>
      )}
      <p className="text-center mt-6">
        <Link href="/login" className="text-xs text-gray-400 hover:text-sky-400 underline underline-offset-2">Voltar para o login</Link>
      </p>
    </>
  )
}
