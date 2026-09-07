import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/ui/BackButton'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import CategoriaCard from '@/components/provas/CategoriaCard'
import AddCategoriaButton from '@/components/provas/AddCategoriaButton'
import ResultadosSection from '@/components/provas/ResultadosSection'
import { Pencil, MapPin, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { statusProva } from '@/lib/provas'
import { deleteProva } from '../actions'
import type { ProvaRow, ProvaCategoriaRow } from '@/types/database'

export default async function ProvaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: provaRaw }, { data: categoriasRaw }, { data: resultadosRaw }, { data: alunosRaw }] =
    await Promise.all([
      supabase.from('provas').select('*').eq('id', id).single(),
      supabase.from('prova_categorias').select('*').eq('prova_id', id).order('ordem'),
      supabase
        .from('resultados_prova')
        .select('*, aluno:aluno_id ( nome ), categoria:categoria_id ( nome )')
        .eq('prova_id', id),
      supabase.from('alunos').select('id, nome').eq('status', 'ativo').order('nome'),
    ])

  if (!provaRaw) notFound()

  const prova = provaRaw as ProvaRow
  const categorias = (categoriasRaw ?? []) as ProvaCategoriaRow[]
  const alunos = (alunosRaw ?? []) as { id: string; nome: string }[]

  type ResultadoJoined = {
    id: string
    aluno_id: string
    categoria_id: string
    tempo_total_segundos: number | null
    colocacao_geral: number | null
    colocacao_categoria: number | null
    aluno: { nome: string } | null
    categoria: { nome: string } | null
  }
  const resultados = ((resultadosRaw ?? []) as ResultadoJoined[]).map((r) => ({
    id: r.id,
    aluno_id: r.aluno_id,
    aluno_nome: r.aluno?.nome ?? '—',
    categoria_id: r.categoria_id,
    categoria_nome: r.categoria?.nome ?? '—',
    tempo_total_segundos: r.tempo_total_segundos,
    colocacao_geral: r.colocacao_geral,
    colocacao_categoria: r.colocacao_categoria,
  }))
  resultados.sort((a, b) => a.aluno_nome.localeCompare(b.aluno_nome))

  const resultadosPorCategoria = new Map<string, number>()
  for (const r of resultados) {
    resultadosPorCategoria.set(r.categoria_id, (resultadosPorCategoria.get(r.categoria_id) ?? 0) + 1)
  }

  const deleteProvaAction = deleteProva.bind(null, prova.id)

  return (
    <div className="p-4 sm:p-8 max-w-4xl space-y-6">
      <BackButton fallback="/provas" />

      <PageHeader
        title={prova.nome}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><MapPin size={13} /> {prova.local}</span>
            <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(prova.data)}</span>
            <Badge variant={statusProva(prova.data) === 'agendada' ? 'sky' : 'gray'}>
              {statusProva(prova.data) === 'agendada' ? 'Agendada' : 'Realizada'}
            </Badge>
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Link href={`/provas/${prova.id}/editar`}>
              <Button variant="secondary" size="sm"><Pencil size={14} /> Editar</Button>
            </Link>
            <ConfirmDeleteButton
              variant="full"
              label="Excluir prova"
              confirmLabel="Confirmar exclusão?"
              action={deleteProvaAction}
            />
          </div>
        }
      />

      {prova.observacoes && (
        <Card>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{prova.observacoes}</p>
        </Card>
      )}

      <div>
        <p className="text-sm font-semibold text-navy-500 mb-3">Categorias</p>
        <div className="space-y-3">
          {categorias.map((c) => (
            <CategoriaCard
              key={c.id}
              categoria={c}
              provaId={prova.id}
              resultadosCount={resultadosPorCategoria.get(c.id) ?? 0}
            />
          ))}
        </div>
        <div className="mt-3">
          <AddCategoriaButton provaId={prova.id} />
        </div>
      </div>

      <ResultadosSection
        provaId={prova.id}
        categorias={categorias.map((c) => ({ id: c.id, nome: c.nome }))}
        alunos={alunos}
        resultados={resultados}
      />
    </div>
  )
}
