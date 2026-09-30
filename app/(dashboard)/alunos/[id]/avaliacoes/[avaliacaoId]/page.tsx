import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BackButton from '@/components/ui/BackButton'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import ProespBadges from '@/components/avaliacoes/ProespBadges'
import { formatDate, idadeNaData, secondsToMmss } from '@/lib/utils'
import { classificarProesp, IDADE_MIN, IDADE_MAX, type ClassificacaoTeste } from '@/lib/proesp'
import { calcularMaturacao } from '@/lib/maturacao'
import { zonasCorrida, minSeg } from '@/lib/zonas'
import DeleteAvaliacaoIndividualButton from './DeleteAvaliacaoIndividualButton'
import type { AvaliacaoFisicaRow, SexoEnum } from '@/types/database'

function Stat({ label, value, c }: { label: string; value: string | null; c?: ClassificacaoTeste }) {
  if (value == null) return null
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm font-semibold text-navy-500 mt-0.5">{value}</dd>
      <ProespBadges c={c} />
    </div>
  )
}

const cm = (m: number) => `${Math.round(m * 1000) / 10} cm`

export default async function AvaliacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string; avaliacaoId: string }>
}) {
  const { id, avaliacaoId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: avRaw }] = await Promise.all([
    supabase.from('alunos').select('id, nome, sexo, data_nascimento').eq('id', id).single(),
    supabase
      .from('avaliacoes_fisicas')
      .select('*')
      .eq('id', avaliacaoId)
      .eq('aluno_id', id)
      .is('deleted_at', null)
      .single(),
  ])

  if (!alunoRaw || !avRaw) notFound()

  const aluno = alunoRaw as { id: string; nome: string; sexo: SexoEnum | null; data_nascimento: string | null }
  const av = avRaw as AvaliacaoFisicaRow

  const idade = aluno.data_nascimento ? idadeNaData(aluno.data_nascimento, av.data) : null
  const proesp = classificarProesp(av, aluno.sexo, idade)
  const semProesp = !aluno.sexo || idade == null
  const maturacao = calcularMaturacao({
    sexo: aluno.sexo,
    dataNascimento: aluno.data_nascimento,
    dataAvaliacao: av.data,
    estaturaCm: av.estatura != null ? av.estatura * 100 : null,
    massaKg: av.massa_corporal,
    sentadoCm: av.estatura_sentado != null ? av.estatura_sentado * 100 : null,
    alturaBancoCm: av.altura_banco,
  })
  const dab = av.resistencia_5min_dabonneville != null ? zonasCorrida(av.resistencia_5min_dabonneville) : null
  const tronco = av.estatura_sentado != null && av.altura_banco ? av.estatura_sentado - av.altura_banco / 100 : null

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <BackButton />
      <PageHeader
        title="Avaliação Física"
        subtitle={`${aluno.nome} · ${formatDate(av.data)}${idade != null ? ` · ${idade} anos` : ''}`}
      />

      {semProesp ? (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2.5 mb-4">
          Complete o sexo e a data de nascimento no cadastro do atleta para ver a classificação PROESP-Br e a maturação.
        </p>
      ) : (idade! < IDADE_MIN || idade! > IDADE_MAX) && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-2.5 mb-4">
          A classificação PROESP-Br cobre de {IDADE_MIN} a {IDADE_MAX} anos.
        </p>
      )}

      {av.imc != null && (
        <Card className="mb-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-400">IMC</p>
              <p className="text-2xl font-extrabold text-navy-500">{av.imc.toFixed(1)}</p>
            </div>
            <ProespBadges c={proesp.imc} />
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Composição Corporal</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Massa corporal" value={av.massa_corporal != null ? `${av.massa_corporal} kg` : null} />
          <Stat label="Estatura" value={av.estatura != null ? cm(av.estatura) : null} />
          <Stat label="Envergadura" value={av.envergadura != null ? cm(av.envergadura) : null} />
          <Stat
            label={av.altura_banco ? `Estatura sentado (banco ${av.altura_banco} cm)` : 'Estatura sentado'}
            value={av.estatura_sentado != null ? `${cm(av.estatura_sentado)}${tronco != null ? ` · tronco ${cm(tronco)}` : ''}` : null}
          />
          <Stat label="Circunf. abdominal" value={av.perimetro_cintura != null ? `${av.perimetro_cintura} cm` : null} />
          <Stat label="RCE" value={av.rce != null ? av.rce.toFixed(2) : null} c={proesp.rce} />
        </dl>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Força, Potência e Flexibilidade</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Abdominal (1 min)" value={av.forca_abdominal != null ? `${av.forca_abdominal} rep` : null} c={proesp.forca_abdominal} />
          <Stat label="Arremesso medicine ball" value={av.arremesso_medicineball != null ? `${av.arremesso_medicineball} m` : null} c={proesp.arremesso_medicineball} />
          <Stat label="Salto horizontal" value={av.salto_horizontal != null ? `${av.salto_horizontal} m` : null} c={proesp.salto_horizontal} />
          <Stat label="Sentar/alcançar" value={av.sentar_alcancar != null ? `${av.sentar_alcancar} cm` : null} c={proesp.sentar_alcancar} />
        </dl>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-4">Resistência e Velocidade</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Stat label="Resistência 6 min" value={av.resistencia_6min != null ? `${av.resistencia_6min} m` : null} c={proesp.resistencia_6min} />
          <Stat label="Agilidade (quadrado)" value={av.agilidade != null ? `${av.agilidade} s` : null} c={proesp.agilidade} />
          <Stat label="Corrida 20 m" value={av.corrida_20m != null ? `${av.corrida_20m} s` : null} c={proesp.corrida_20m} />
          <Stat
            label="Dabonneville 5 min"
            value={dab ? `${av.resistencia_5min_dabonneville} m · ${dab.kmh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/h · ${minSeg(dab.paceSKm)}/km` : null}
          />
          <Stat
            label="Ciclismo 2 km"
            value={av.ciclismo_2km_tempo != null
              ? `${secondsToMmss(av.ciclismo_2km_tempo)}${av.ciclismo_2km_velocidade != null ? ` · ${av.ciclismo_2km_velocidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/h` : ''}`
              : null}
          />
        </dl>
        {av.atividade_url && (
          <a href={av.atividade_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm text-sky-500 hover:underline">
            Ver atividade do teste ↗
          </a>
        )}
      </Card>

      {(av.natacao_12min != null || av.natacao_50m != null || av.natacao_100m != null) && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-navy-500 mb-4">Natação</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label="50 m" value={av.natacao_50m != null ? secondsToMmss(av.natacao_50m) : null} />
            <Stat label="100 m" value={av.natacao_100m != null ? secondsToMmss(av.natacao_100m) : null} />
            <Stat label="Teste 12 min" value={av.natacao_12min != null ? `${av.natacao_12min} m` : null} />
          </dl>
        </Card>
      )}

      {maturacao && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-navy-500 mb-4">Maturação (Mirwald)</h3>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Stat label="Maturity offset" value={`${maturacao.offset > 0 ? '+' : ''}${maturacao.offset.toLocaleString('pt-BR')} anos`} />
            <Stat label="Idade prevista do PHV" value={`${maturacao.idadePhv.toLocaleString('pt-BR')} anos`} />
            <Stat label="Classificação" value={maturacao.classificacao} />
          </dl>
        </Card>
      )}

      {av.observacoes && (
        <Card className="mb-4">
          <h3 className="text-sm font-semibold text-navy-500 mb-2">Observações</h3>
          <p className="text-sm text-gray-700 whitespace-pre-line">{av.observacoes}</p>
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
