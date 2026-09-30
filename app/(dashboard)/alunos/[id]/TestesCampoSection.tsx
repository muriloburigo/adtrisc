import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import TabelaZonas from '@/components/avaliacoes/TabelaZonas'
import RegistrarTesteForm from './RegistrarTesteForm'
import { Gauge } from 'lucide-react'
import { formatDate, secondsToMmss } from '@/lib/utils'
import { zonasCorrida, zonasCiclismo, minSeg } from '@/lib/zonas'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'

type LinhaTeste = {
  data: string
  resistencia_5min_dabonneville: number | null
  ciclismo_2km_tempo: number | null
  natacao_50m: number | null
  natacao_100m: number | null
}
type Campo = Exclude<keyof LinhaTeste, 'data'>

// Resultado mais recente de cada teste de campo (a avaliação é por data, então
// cada teste pode vir de um dia diferente — ex.: Dabonneville refeito sozinho).
function maisRecente(linhas: LinhaTeste[], campo: Campo) {
  const l = linhas.find((x) => x[campo] != null)
  return l ? { data: l.data, valor: Number(l[campo]) } : null
}

export default async function TestesCampoSection({ alunoId }: { alunoId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data }, config] = await Promise.all([
    supabase
      .from('avaliacoes_fisicas')
      .select('data, resistencia_5min_dabonneville, ciclismo_2km_tempo, natacao_50m, natacao_100m')
      .eq('aluno_id', alunoId)
      .is('deleted_at', null)
      .order('data', { ascending: false }),
    getConfigAvaliacao(supabase),
  ])
  const linhas = (data ?? []) as LinhaTeste[]

  const dab = maisRecente(linhas, 'resistencia_5min_dabonneville')
  const cic = maisRecente(linhas, 'ciclismo_2km_tempo')
  const n50 = maisRecente(linhas, 'natacao_50m')
  const n100 = maisRecente(linhas, 'natacao_100m')
  const corrida = dab && zonasCorrida(dab.valor, config.zona_limites)
  const ciclismo = cic && zonasCiclismo(cic.valor, config.zona_limites)
  const corte = config.natacao_100m_corte_s
  const apto = n100 && corte != null && n100.valor <= corte

  const base = 'text-xs text-gray-400 mb-2'
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Gauge size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">Testes de campo e zonas</h2>
        <div className="ml-auto"><RegistrarTesteForm alunoId={alunoId} /></div>
      </div>

      {!dab && !cic && !n50 && !n100 ? (
        <p className="text-sm text-gray-400">Nenhum teste de campo registrado ainda.</p>
      ) : (
        <div className="space-y-6">
          {corrida && dab && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Corrida</h3>
              <p className={base}>
                Base: Dabonneville 5&apos; de {formatDate(dab.data)} — {dab.valor.toLocaleString('pt-BR')} m ·{' '}
                {corrida.kmh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/h · {minSeg(corrida.paceSKm)}/km
              </p>
              <TabelaZonas zonas={corrida.zonas} modalidade="corrida" />
            </div>
          )}
          {ciclismo && cic && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Ciclismo</h3>
              <p className={base}>
                Base: 2 km de {formatDate(cic.data)} — {secondsToMmss(cic.valor)} ·{' '}
                {ciclismo.kmh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/h
              </p>
              <TabelaZonas zonas={ciclismo.zonas} modalidade="ciclismo" />
            </div>
          )}
          {(n50 || n100) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Natação</h3>
              <div className="flex flex-wrap gap-6 items-center">
                {n50 && (
                  <div>
                    <p className="text-xs text-gray-400">50 m · {formatDate(n50.data)}</p>
                    <p className="text-sm font-semibold text-navy-500 tabular-nums">{secondsToMmss(n50.valor)}</p>
                  </div>
                )}
                {n100 && (
                  <div>
                    <p className="text-xs text-gray-400">100 m · {formatDate(n100.data)}</p>
                    <p className="text-sm font-semibold text-navy-500 tabular-nums">{secondsToMmss(n100.valor)}</p>
                  </div>
                )}
                {corte != null && n100 && (
                  apto
                    ? <Badge variant="green">Apto para a equipe</Badge>
                    : <Badge variant="gray">Corte da equipe: {secondsToMmss(corte)}</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
