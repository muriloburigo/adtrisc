import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { AlunoRow, AvaliacaoFisicaRow } from '@/types/database'

function Valor({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0 flex justify-between items-baseline gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-navy-500 tabular-nums">
        {value != null ? `${value}${unit ? ' ' + unit : ''}` : <span className="text-gray-300 font-normal">—</span>}
      </span>
    </div>
  )
}

function imcInfo(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-500 bg-blue-50' }
  if (imc < 25)   return { label: 'Peso normal',    color: 'text-emerald-600 bg-emerald-50' }
  if (imc < 30)   return { label: 'Sobrepeso',      color: 'text-amber-500 bg-amber-50' }
  return           { label: 'Obesidade',             color: 'text-red-500 bg-red-50' }
}
function rceInfo(rce: number): { label: string; color: string } {
  if (rce < 0.5)  return { label: 'Baixo risco',      color: 'text-emerald-600 bg-emerald-50' }
  if (rce < 0.6)  return { label: 'Risco moderado',   color: 'text-amber-500 bg-amber-50' }
  return           { label: 'Alto risco',              color: 'text-red-500 bg-red-50' }
}

export default async function AvaliacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string; avaliacaoId: string }>
}) {
  const { id, avaliacaoId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: avRaw }] = await Promise.all([
    supabase.from('alunos').select('id, nome').eq('id', id).single(),
    supabase.from('avaliacoes_fisicas').select('*').eq('id', avaliacaoId).eq('aluno_id', id).single(),
  ])

  if (!alunoRaw || !avRaw) notFound()

  const aluno = alunoRaw as Pick<AlunoRow, 'id' | 'nome'>
  const av    = avRaw as AvaliacaoFisicaRow

  const imcI = av.imc != null ? imcInfo(av.imc) : null
  const rceI = av.rce != null ? rceInfo(av.rce) : null

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href={`/alunos/${id}/avaliacoes`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-navy-500 transition-colors"
        >
          <ChevronLeft size={15} /> Avaliações de {aluno.nome}
        </Link>
      </div>

      <PageHeader
        title="Avaliação Física"
        subtitle={
          <span className="flex items-center gap-1.5">
            <Calendar size={13} /> {formatDate(av.data)} · {aluno.nome}
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medidas Corporais */}
        <Card>
          <h3 className="text-sm font-semibold text-navy-500 mb-3">Medidas Corporais</h3>
          <Valor label="Massa Corporal"       value={av.massa_corporal}        unit="kg" />
          <Valor label="Estatura"             value={av.estatura}              unit="m"  />
          <Valor label="Perímetro da Cintura" value={av.perimetro_cintura}     unit="cm" />
          <Valor label="Envergadura"          value={av.envergadura}           unit="cm" />
          <Valor label="Estatura Sentado"     value={av.estatura_sentado}      unit="cm" />
        </Card>

        {/* Índices */}
        <Card>
          <h3 className="text-sm font-semibold text-navy-500 mb-3">Índices Calculados</h3>
          <Valor label="Altura (cm)"    value={av.altura_cm}           unit="cm" />
          <Valor label="Altura²"        value={av.altura_ao_quadrado != null ? +av.altura_ao_quadrado.toFixed(4) : null} unit="m²" />

          <div className="py-2 border-b border-gray-50 flex justify-between items-center gap-4">
            <span className="text-sm text-gray-500">IMC</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-500 tabular-nums">
                {av.imc != null ? av.imc.toFixed(2) : <span className="text-gray-300 font-normal">—</span>}
              </span>
              {imcI && av.imc != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${imcI.color}`}>
                  {imcI.label}
                </span>
              )}
            </div>
          </div>

          <div className="py-2 flex justify-between items-center gap-4">
            <span className="text-sm text-gray-500">RCE</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-navy-500 tabular-nums">
                {av.rce != null ? av.rce.toFixed(4) : <span className="text-gray-300 font-normal">—</span>}
              </span>
              {rceI && av.rce != null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rceI.color}`}>
                  {rceI.label}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Testes Físicos */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-navy-500 mb-3">Testes de Aptidão Física</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8">
            <div>
              <Valor label="Sentar e Alcançar"      value={av.sentar_alcancar}         unit="cm" />
              <Valor label="Resistência 6'"          value={av.resistencia_6min}        unit="m"  />
            </div>
            <div>
              <Valor label="Força Abdominal"         value={av.forca_abdominal}         unit="rep"/>
              <Valor label="Arremesso Medicineball"  value={av.arremesso_medicineball}  unit="m"  />
            </div>
            <div>
              <Valor label="Agilidade"              value={av.agilidade}               unit="s"  />
              <Valor label="Salto Horizontal"       value={av.salto_horizontal}        unit="m"  />
            </div>
            <div>
              <Valor label="Corrida de 20m"         value={av.corrida_20m}             unit="s"  />
              <Valor label="12' Natação"            value={av.natacao_12min}           unit="m"  />
            </div>
          </div>
        </Card>

        {/* Observações */}
        {av.observacoes && (
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-navy-500 mb-2">Observações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{av.observacoes}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
