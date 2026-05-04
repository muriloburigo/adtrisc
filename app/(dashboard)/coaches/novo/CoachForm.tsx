'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import PasswordInput from '@/components/ui/PasswordInput'
import { createCoach } from '../actions'

export default function CoachForm() {
  const [state, formAction, isPending] = useActionState(createCoach, null)

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Nome completo"
        name="full_name"
        placeholder="Nome do(a) treinador(a)"
        required
      />
      <Input
        label="E-mail"
        name="email"
        type="email"
        placeholder="treinador@email.com"
        required
      />
      <PasswordInput
        name="password"
        label="Senha inicial"
        required
      />
      <p className="text-xs text-gray-400 -mt-2">
        O/A treinador(a) poderá alterar após o primeiro acesso.
      </p>

      {state?.error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Cadastrando…' : 'Cadastrar Treinador(a)'}
        </Button>
        <Link href="/coaches">
          <Button type="button" variant="secondary">Cancelar</Button>
        </Link>
      </div>
    </form>
  )
}
