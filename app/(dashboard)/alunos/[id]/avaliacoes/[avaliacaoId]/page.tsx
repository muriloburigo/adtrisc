import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/ui/BackButton'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import DeleteAvaliacaoIndividualButton from './DeleteAvaliacaoIndividualButton'
import type { AvaliacaoFisicaRow } from '@/types/database'

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

function Stat({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm font-semibold text-navy-500 mt-0.5">{value}</dd>
    </div>
  )
}

export default async function AvaliacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string; avaliacaoId: string }>
}) {
  const { id, avaliacaoId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: avRaw }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('id', id).single(),
    supabase
      .from('avaliacoes_fisicas')
      .select('*')
      .eq('id', avaliacaoId)
      .eq('aluno_id', id)
      .is('deleted_at', null)
      .single(),
  ])

  if (!alunoRaw || !avRaw) notFound()

  const aluno = alunoRaw as { id: string; nome: string }
  const av = avRaw as AvaliacaoFisicaRow

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader title="Avaliação Física" subtitle={`${aluno.nome} · ${formatDate(av.data)}`} />

      {av.imc != null && (
        <Card className="mb-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400">IMC</p>
              <p className={`text-2xl font-extrabold px-2 py-0.5 rounded ${imcColor(av.imc)}`}>
                {av.imc.toFixed(1)}
              </p>
            </div>
            <p className="text-sm text-gray-500">{imcLabel(av.imc)}</p>
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Composição Corporal</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Massa corporal" value={av.massa_corporal != null ? `${av.massa_corporal} kg` : null} />
          <Stat label="Estatura" value={av.estatura != null ? `${(av.estatura * 100).toFixed(0)} cm` : null} />
          <Stat label="Envergadura" value={av.envergadura != null ? `${(av.envergadura * 100).toFixed(0)} cm` : null} />
          <Stat label="Estatura sentado" value={av.estatura_sentado != null ? `${(av.estatura_sentado * 100).toFixed(0)} cm` : null} />
          <Stat label="Circunf. abdominal" value={av.perimetro_cintura != null ? `${av.perimetro_cintura} cm` : null} />
          <Stat label="RCE" value={av.rce != null ? av.rce.toFixed(3) : null} />
        </dl>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Força e Potência</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Força abdominal" value={av.forca_abdominal != null ? `${av.forca_abdominal} rep` : null} />
          <Stat label="Arremesso medicine ball" value={av.arremesso_medicineball != null ? `${av.arremesso_medicineball} m` : null} />
          <Stat label="Salto horizontal" value={av.salto_horizontal != null ? `${av.salto_horizontal} m` : null} />
          <Stat label="Sentar/alcançar" value={av.sentar_alcancar != null ? `${av.sentar_alcancar} cm` : null} />
        </dl>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Resistência e Velocidade</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Resistência 6 min" value={av.resistencia_6min != null ? `${av.resistencia_6min} m` : null} />
          <Stat label="Teste 12 min" value={av.natacao_12min != null ? `${av.natacao_12min} m` : null} />
          <Stat label="Agilidade" value={av.agilidade != null ? `${av.agilidade} s` : null} />
          <Stat label="Corrida 20 m" value={av.corrida_20m != null ? `${av.corrida_20m} s` : null} />
        </dl>
      </Card>

      {av.observacoes && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-navy-500 mb-2">Observações</h3>
          <p className="text-sm text-gray-700">{av.observacoes}</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <DeleteAvaliacaoIndividualButton avaliacaoId={av.id} alunoId={id} />
          <Link href={`/alunos/${id}`} className="text-sm text-sky-500 hover:underline">
            Voltar ao atleta
          </Link>
        </div>
      </Card>
    </div>
  )
}
