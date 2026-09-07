'use client'

import { useState, useTransition } from 'react'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { secondsToMmss } from '@/lib/utils'
import { saveResultado } from '@/app/(dashboard)/provas/actions'

type Categoria = { id: string; nome: string }
type Aluno = { id: string; nome: string }

type Initial = {
  aluno_id: string
  aluno_nome: string
  categoria_id: string
  tempo_total_segundos: number | null
  colocacao_geral: number | null
  colocacao_categoria: number | null
}

export default function ResultadoFormInline({
  provaId,
  categorias,
  alunos,
  initial,
  onCancel,
  onSuccess,
}: {
  provaId: string
  categorias: Categoria[]
  alunos?: Aluno[]
  initial?: Initial
  onCancel?: () => void
  onSuccess?: () => void
}) {
  const [alunoId, setAlunoId] = useState(initial?.aluno_id ?? '')
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id ?? categorias[0]?.id ?? '')
  const [tempo, setTempo] = useState(
    initial?.tempo_total_segundos != null ? secondsToMmss(initial.tempo_total_segundos) : '',
  )
  const [colocGeral, setColocGeral] = useState(initial?.colocacao_geral?.toString() ?? '')
  const [colocCat, setColocCat] = useState(initial?.colocacao_categoria?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('prova_id', provaId)
    fd.set('aluno_id', alunoId)
    fd.set('aluno_nome', initial?.aluno_nome ?? alunos?.find((a) => a.id === alunoId)?.nome ?? '')
    fd.set('categoria_id', categoriaId)
    fd.set('tempo_total', tempo.trim())
    fd.set('colocacao_geral', colocGeral)
    fd.set('colocacao_categoria', colocCat)
    startTransition(async () => {
      const res = await saveResultado(fd)
      if (res?.error) setError(res.error)
      else onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {alunos ? (
          <Select
            label="Atleta"
            options={alunos.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Selecione..."
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            required
          />
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Atleta</span>
            <p className="text-sm text-navy-500 font-medium py-2">{initial?.aluno_nome}</p>
          </div>
        )}
        <Select
          label="Categoria"
          options={categorias.map((c) => ({ value: c.id, label: c.nome }))}
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          label="Tempo total"
          placeholder="MM:SS (ex: 45:32)"
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
        />
        <Input
          label="Colocação geral"
          type="number"
          min="1"
          value={colocGeral}
          onChange={(e) => setColocGeral(e.target.value)}
        />
        <Input
          label="Colocação na categoria"
          type="number"
          min="1"
          value={colocCat}
          onChange={(e) => setColocCat(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !alunoId || !categoriaId}>
          {isPending ? 'Salvando…' : 'Salvar resultado'}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
