'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { updateCoach } from '../../actions'

export default function EditarCoachForm({
  id,
  fullName,
  cref,
}: {
  id: string
  fullName: string
  cref: string
}) {
  const router = useRouter()
  const action = updateCoach.bind(null, id)
  const [state, formAction, isPending] = useActionState(action, null)

  useEffect(() => {
    if (state && 'done' in state && state.done) {
      router.push('/coaches')
    }
  }, [state, router])

  const error = state && 'error' in state ? state.error : null

  return (
    <form action={formAction} className="space-y-5">
      <Input
        label="Nome completo"
        name="full_name"
        defaultValue={fullName}
        placeholder="Nome do(a) treinador(a)"
        required
      />
      <Input
        label="CREF (opcional)"
        name="cref"
        defaultValue={cref}
        placeholder="Ex: 36090-G/SC"
      />
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
        <Link href="/coaches">
          <Button type="button" variant="secondary">Cancelar</Button>
        </Link>
      </div>
    </form>
  )
}
