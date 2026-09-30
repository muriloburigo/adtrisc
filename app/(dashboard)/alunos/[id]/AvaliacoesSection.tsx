import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Plus, ClipboardList, TrendingUp } from 'lucide-react'
import { formatDate, idadeNaData, secondsToMmss } from '@/lib/utils'
import { classificarProesp } from '@/lib/proesp'
import type { AvaliacaoFisicaRow, SexoEnum } from '@/types/database'

export default async function AvaliacoesSection({ alunoId }: { alunoId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: avaliacoesRaw }, { data: aluno }] = await Promise.all([
    supabase
      .from('avaliacoes_fisicas')
      .select('*')
      .eq('aluno_id', alunoId)
      .is('deleted_at', null)
      .order('data', { ascending: false }),
    supabase.from('alunos').select('sexo, data_nascimento').eq('id', alunoId).single(),
  ])

  const avaliacoes = (avaliacoesRaw ?? []) as AvaliacaoFisicaRow[]
  const { sexo, data_nascimento } = (aluno ?? {}) as { sexo: SexoEnum | null; data_nascimento: string | null }
  // Zona de saúde do IMC pelo PROESP-Br (pontos de corte por sexo e idade)
  const zonaImc = (av: AvaliacaoFisicaRow) =>
    classificarProesp(av, sexo, data_nascimento ? idadeNaData(data_nascimento, av.data) : null).imc?.saude

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-sky-400" />
          <h2 className="text-sm font-semibold text-navy-500">Avaliações Físicas</h2>
        </div>
        <Link href={`/alunos/${alunoId}/avaliacoes/nova`}>
          <Button size="sm"><Plus size={14} />Nova</Button>
        </Link>
      </div>

      {avaliacoes.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma avaliação registrada"
          description="Clique em 'Nova' para registrar a primeira"
        />
      ) : (
        <div className="space-y-3">
          {avaliacoes.map((av, idx) => (
            <Link
              key={av.id}
              href={`/alunos/${alunoId}/avaliacoes/${av.id}`}
              className="block border border-gray-100 rounded-xl p-3 hover:border-sky-400 transition-colors"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <span className="text-xs bg-sky-100 text-sky-600 font-semibold px-2 py-0.5 rounded-full">
                      Mais recente
                    </span>
                  )}
                  <p className="font-semibold text-navy-500 text-sm">{formatDate(av.data)}</p>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {av.imc != null && (
                    <div className="text-center">
                      <p className="text-[11px] text-gray-400">IMC</p>
                      <p className={`text-xs font-bold px-2 py-0.5 rounded ${
                        zonaImc(av) === 'risco' ? 'text-red-500 bg-red-50' : zonaImc(av) === 'saudavel' ? 'text-emerald-600 bg-emerald-50' : 'text-navy-500'
                      }`}>
                        {av.imc.toFixed(1)}
                      </p>
                      {zonaImc(av) && (
                        <p className="text-[10px] text-gray-400">{zonaImc(av) === 'risco' ? 'Zona de risco' : 'Zona saudável'}</p>
                      )}
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
                  {av.resistencia_5min_dabonneville != null && (
                    <Stat label="Dabonn. 5'" value={`${av.resistencia_5min_dabonneville} m`} />
                  )}
                  {av.ciclismo_2km_tempo != null && (
                    <Stat label="Bike 2 km" value={secondsToMmss(av.ciclismo_2km_tempo)} />
                  )}
                  {av.natacao_100m != null && (
                    <Stat label="Nado 100 m" value={secondsToMmss(av.natacao_100m)} />
                  )}
                  {idx > 0 && avaliacoes[idx - 1].imc != null && av.imc != null && (
                    <Evolution prev={avaliacoes[idx - 1].imc!} curr={av.imc} label="IMC" />
                  )}
                </div>
              </div>
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
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-navy-500">{value}</p>
    </div>
  )
}

function Evolution({ prev, curr, label }: { prev: number; curr: number; label: string }) {
  const diff = curr - prev
  if (Math.abs(diff) < 0.01) return null
  const up = diff > 0
  return (
    <div className="text-center">
      <p className="text-[11px] text-gray-400">Δ {label}</p>
      <p className={`text-xs font-semibold flex items-center gap-0.5 ${up ? 'text-amber-500' : 'text-emerald-600'}`}>
        <TrendingUp size={11} className={up ? '' : 'rotate-180'} />
        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
      </p>
    </div>
  )
}
