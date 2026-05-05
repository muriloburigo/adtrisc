import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { ChevronLeft, Plus, ClipboardList, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AlunoRow, AvaliacaoFisicaRow } from '@/types/database'

function imcLabel(imc: number): string {
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25)   return 'Normal'
  if (imc < 30)   return 'Sobrepeso'
  return 'Obesidade'
}
function imcColor(imc: number): string {
  if (imc < 18.5) return 'text-blue-500 bg-blue-50'
  if (imc < 25)   return 'text-emerald-600 bg-emerald-50'
  if (imc < 30)   return 'text-amber-500 bg-amber-50'
  return 'text-red-500 bg-red-50'
}

export default async function AvaliacoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: avaliacoesRaw }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('id', id).single(),
    supabase
      .from('avaliacoes_fisicas')
      .select('*')
      .eq('aluno_id', id)
      .order('data', { ascending: false }),
  ])

  if (!alunoRaw) notFound()

  const aluno = alunoRaw as Pick<AlunoRow, 'id' | 'nome'>
  const avaliacoes = (avaliacoesRaw ?? []) as AvaliacaoFisicaRow[]

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href={`/alunos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-navy-500 transition-colors"
        >
          <ChevronLeft size={15} /> {aluno.nome}
        </Link>
      </div>

      <PageHeader
        title="Avaliações Físicas"
        subtitle={aluno.nome}
        action={
          <Link href={`/alunos/${id}/avaliacoes/nova`}>
            <Button><Plus size={15} />Nova avaliação</Button>
          </Link>
        }
      />

      {avaliacoes.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma avaliação registrada"
            description="Clique em 'Nova avaliação' para registrar a primeira"
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {avaliacoes.map((av, idx) => (
            <Link key={av.id} href={`/alunos/${id}/avaliacoes/${av.id}`}>
              <Card className="hover:border-sky-400 transition-colors cursor-pointer">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {idx === 0 && (
                      <span className="text-xs bg-sky-100 text-sky-600 font-semibold px-2 py-0.5 rounded-full">
                        Mais recente
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-navy-500">{formatDate(av.data)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    {av.imc != null && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400">IMC</p>
                        <p className={`text-sm font-bold px-2 py-0.5 rounded ${imcColor(av.imc)}`}>
                          {av.imc.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-400">{imcLabel(av.imc)}</p>
                      </div>
                    )}
                    {av.massa_corporal != null && (
                      <Stat label="Massa" value={`${av.massa_corporal} kg`} />
                    )}
                    {av.estatura != null && (
                      <Stat label="Estatura" value={`${(av.estatura * 100).toFixed(0)} cm`} />
                    )}
                    {av.resistencia_6min != null && (
                      <Stat label="Resist. 6'" value={`${av.resistencia_6min} m`} />
                    )}
                    {av.forca_abdominal != null && (
                      <Stat label="Abd." value={`${av.forca_abdominal} rep`} />
                    )}
                    {idx > 0 && avaliacoes[idx - 1].imc != null && av.imc != null && (
                      <Evolution prev={avaliacoes[idx - 1].imc!} curr={av.imc} label="IMC" />
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-navy-500">{value}</p>
    </div>
  )
}

function Evolution({ prev, curr, label }: { prev: number; curr: number; label: string }) {
  const diff = curr - prev
  if (Math.abs(diff) < 0.01) return null
  const up = diff > 0
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">Δ {label}</p>
      <p className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-amber-500' : 'text-emerald-600'}`}>
        <TrendingUp size={11} className={up ? '' : 'rotate-180'} />
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </p>
    </div>
  )
}
