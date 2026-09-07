'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trophy } from 'lucide-react'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import ResultadoFormInline from './ResultadoFormInline'
import { secondsToMmss } from '@/lib/utils'
import { deleteResultado } from '@/app/(dashboard)/provas/actions'

type Categoria = { id: string; nome: string }
type Aluno = { id: string; nome: string }
type Resultado = {
  id: string
  aluno_id: string
  aluno_nome: string
  categoria_id: string
  categoria_nome: string
  tempo_total_segundos: number | null
  colocacao_geral: number | null
  colocacao_categoria: number | null
}

export default function ResultadosSection({
  provaId,
  categorias,
  alunos,
  resultados,
}: {
  provaId: string
  categorias: Categoria[]
  alunos: Aluno[]
  resultados: Resultado[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const alunosSemResultado = alunos.filter((a) => !resultados.some((r) => r.aluno_id === a.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-navy-500">Resultados</p>
        {!adding && alunosSemResultado.length > 0 && categorias.length > 0 && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-600 font-medium"
          >
            <Plus size={15} /> Lançar resultado
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4">
          <ResultadoFormInline
            provaId={provaId}
            categorias={categorias}
            alunos={alunosSemResultado}
            onCancel={() => setAdding(false)}
            onSuccess={() => { setAdding(false); router.refresh() }}
          />
        </div>
      )}

      <Card padding={false}>
        {resultados.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhum resultado lançado"
            description={categorias.length === 0 ? 'Cadastre ao menos uma categoria antes de lançar resultados.' : 'Os resultados dos atletas aparecerão aqui.'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {resultados.map((r) => (
              <div key={r.id} className="p-4">
                {editingId === r.id ? (
                  <ResultadoFormInline
                    provaId={provaId}
                    categorias={categorias}
                    initial={{
                      aluno_id: r.aluno_id,
                      aluno_nome: r.aluno_nome,
                      categoria_id: r.categoria_id,
                      tempo_total_segundos: r.tempo_total_segundos,
                      colocacao_geral: r.colocacao_geral,
                      colocacao_categoria: r.colocacao_categoria,
                    }}
                    onCancel={() => setEditingId(null)}
                    onSuccess={() => { setEditingId(null); router.refresh() }}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-500">{r.aluno_nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.categoria_nome}</p>
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Tempo</p>
                        <p className="text-sm font-mono text-navy-500">
                          {r.tempo_total_segundos != null ? secondsToMmss(r.tempo_total_segundos) : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Geral</p>
                        <p className="text-sm font-semibold text-navy-500">{r.colocacao_geral ?? '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Categoria</p>
                        <p className="text-sm font-semibold text-navy-500">{r.colocacao_categoria ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingId(r.id)}
                          className="text-gray-300 hover:text-sky-500 transition-colors p-1 rounded cursor-pointer"
                          title="Editar resultado"
                        >
                          <Pencil size={14} />
                        </button>
                        <ConfirmDeleteButton
                          title="Excluir resultado"
                          action={() => deleteResultado(r.id, provaId)}
                          onSuccess={() => router.refresh()}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
