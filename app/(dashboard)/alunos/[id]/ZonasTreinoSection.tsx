import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { Gauge } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { ZonaTreinoRow } from '@/types/database'

const NOMES_ZONA = ['Muito leve', 'Leve', 'Moderado', 'Forte', 'Muito forte']

// Pace (s/km) e tempo de 400 m (s) → "M:SS"
function minSeg(s: number): string {
  const total = Math.round(s)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function faixa(min: number | null, max: number | null, fmt: (n: number) => string): string {
  if (min == null && max == null) return '—'
  if (min == null) return `até ${fmt(max!)}`
  if (max == null) return `acima de ${fmt(min)}`
  return `${fmt(min)} – ${fmt(max)}`
}

const kmh = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const bpm = (n: number) => String(n)

function TabelaZonas({ titulo, zonas, modalidade }: {
  titulo: string
  zonas: ZonaTreinoRow[]
  modalidade: ZonaTreinoRow['modalidade']
}) {
  const temFc = zonas.some((z) => z.fc_min != null || z.fc_max != null)
  const th = 'text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-2 pr-3'
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-500 mb-2">{titulo}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Zona</th>
              <th className={th}>{modalidade === 'corrida' ? 'Pace (min/km)' : 'Velocidade (km/h)'}</th>
              {temFc && <th className={th}>FC (bpm)</th>}
              <th className={th}>400 m</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {zonas.map((z) => (
              <tr key={z.id}>
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <span className="font-semibold text-navy-500">Z{z.zona}</span>
                  <span className="text-gray-400 text-xs ml-1.5">{NOMES_ZONA[z.zona - 1]}</span>
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">
                  {faixa(z.faixa_min, z.faixa_max, modalidade === 'corrida' ? minSeg : kmh)}
                </td>
                {temFc && <td className="py-1.5 pr-3 whitespace-nowrap text-gray-700">{faixa(z.fc_min, z.fc_max, bpm)}</td>}
                <td className="py-1.5 whitespace-nowrap text-gray-700">{faixa(z.tempo_400m_min, z.tempo_400m_max, minSeg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default async function ZonasTreinoSection({ alunoId }: { alunoId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const { data } = await supabase
    .from('zonas_treino')
    .select('*')
    .eq('aluno_id', alunoId)
    .order('zona')

  const zonas = (data ?? []) as ZonaTreinoRow[]
  if (zonas.length === 0) return null

  const corrida = zonas.filter((z) => z.modalidade === 'corrida')
  const ciclismo = zonas.filter((z) => z.modalidade === 'ciclismo')
  const referencia = zonas.find((z) => z.referencia_data)?.referencia_data

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Gauge size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">Zonas de Treino</h2>
        {referencia && <span className="text-xs text-gray-400 ml-auto">Avaliação de {formatDate(referencia)}</span>}
      </div>
      <div className="space-y-5">
        {corrida.length > 0 && <TabelaZonas titulo="Corrida" zonas={corrida} modalidade="corrida" />}
        {ciclismo.length > 0 && <TabelaZonas titulo="Ciclismo" zonas={ciclismo} modalidade="ciclismo" />}
      </div>
    </Card>
  )
}
