'use client'

import { useRef, useState, useTransition } from 'react'
import { Link2, Plus } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { adicionarMateria } from '@/app/(dashboard)/imprensa/actions'

export default function MateriaForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await adicionarMateria(fd)
      if (res.error) { setError(res.error); return }
      formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
      <div className="flex-1 w-full">
        <Input
          name="url"
          type="url"
          label="Link da matéria"
          placeholder="https://exemplo.com/materia-sobre-a-adtrisc"
          required
          error={error ?? undefined}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Link2 size={16} className="animate-pulse" /> : <Plus size={16} />}
        {pending ? 'Buscando preview…' : 'Adicionar'}
      </Button>
    </form>
  )
}
