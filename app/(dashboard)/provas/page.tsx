import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import FilterBar from '@/components/ui/FilterBar'
import { Trophy, Plus, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { statusProva } from '@/lib/provas'
import type { ProvaRow } from '@/types/database'

export const dynamic = 'force-dynamic'

function gerarAnosOptions(anos: number[]) {
  return [...new Set(anos)].sort((a, b) => b - a).map((a) => ({ value: String(a), label: String(a) }))
}

export default async function ProvasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const filters = await searchParams
  const q = filters.q ?? ''
  const status = filters.status ?? ''
  const ano = filters.ano ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: provasRaw }, { data: categoriasRaw }, { data: resultadosRaw }] = await Promise.all([
    supabase.from('provas').select('*').order('data', { ascending: false }),
    supabase.from('prova_categorias').select('id, prova_id'),
    supabase.from('resultados_prova').select('id, prova_id'),
  ])

  let provas = (provasRaw ?? []) as ProvaRow[]

  const categoriasPorProva = new Map<string, number>()
  for (const c of categoriasRaw ?? []) {
    categoriasPorProva.set(c.prova_id, (categoriasPorProva.get(c.prova_id) ?? 0) + 1)
  }
  const resultadosPorProva = new Map<string, number>()
  for (const r of resultadosRaw ?? []) {
    resultadosPorProva.set(r.prova_id, (resultadosPorProva.get(r.prova_id) ?? 0) + 1)
  }

  if (q) provas = provas.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()))
  if (status) provas = provas.filter((p) => statusProva(p.data) === status)
  if (ano) provas = provas.filter((p) => p.data.slice(0, 4) === ano)

  const filterFields = [
    { type: 'search' as const, key: 'q', placeholder: 'Buscar prova...' },
    {
      type: 'select' as const, key: 'status', placeholder: 'Todos os status',
      options: [{ value: 'agendada', label: 'Agendada' }, { value: 'realizada', label: 'Realizada' }],
    },
    {
      type: 'select' as const, key: 'ano', placeholder: 'Todos os anos',
      options: gerarAnosOptions((provasRaw ?? []).map((p: ProvaRow) => Number(p.data.slice(0, 4)))),
    },
  ]

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <PageHeader
        title="Provas"
        subtitle="Competições externas e resultados dos atletas"
        action={
          <Link href="/provas/nova">
            <Button><Plus size={16} /> Nova prova</Button>
          </Link>
        }
      />

      <FilterBar fields={filterFields} initialValues={{ q, status, ano }} />

      <Card padding={false}>
        {provas.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Nenhuma prova encontrada"
            description={q || status || ano ? 'Tente ajustar os filtros.' : 'Cadastre a primeira prova para começar a registrar resultados.'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {provas.map((p) => (
              <Link
                key={p.id}
                href={`/provas/${p.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-navy-500 truncate">{p.nome}</p>
                    <Badge variant={statusProva(p.data) === 'agendada' ? 'sky' : 'gray'}>
                      {statusProva(p.data) === 'agendada' ? 'Agendada' : 'Realizada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin size={11} /> {p.local} · {formatDate(p.data)}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Categorias</p>
                    <p className="text-sm font-semibold text-navy-500">{categoriasPorProva.get(p.id) ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Resultados</p>
                    <p className="text-sm font-semibold text-navy-500">{resultadosPorProva.get(p.id) ?? 0}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
