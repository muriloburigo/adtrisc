'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { updateUser } from '../../actions'
import type { UserRole } from '@/types/database'

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin',  label: 'Administrador(a)' },
  { value: 'coach',  label: 'Treinador(a)'      },
  { value: 'aluno',  label: 'Atleta'             },
  { value: 'pai',    label: 'Responsável'        },
]

type State = { error?: string } | null

export default function UserEditForm({
  userId,
  defaultName,
  defaultRole,
  email,
}: {
  userId: string
  defaultName: string
  defaultRole: UserRole
  email: string
}) {
  const action = updateUser.bind(null, userId)
  const [state, formAction, isPending] = useActionState<State, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {state.error}
        </p>
      )}

      <Input
        label="Nome completo"
        name="full_name"
        defaultValue={defaultName}
        placeholder="Nome do usuário"
        required
      />

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">E-mail</label>
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          {email}
        </p>
        <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado aqui.</p>
      </div>

      <Select
        label="Perfil"
        name="role"
        defaultValue={defaultRole}
        options={roleOptions}
        required
      />

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
        <Link href="/configuracoes">
          <Button type="button" variant="secondary">Cancelar</Button>
        </Link>
      </div>
    </form>
  )
}
