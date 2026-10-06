import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Star, UserCog } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { atletaLogado, treinosDoAtleta } from '@/lib/portalAtleta'
import { referenciasDosAtletas, referenciaDe } from '@/lib/treinos/referencia'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import { descreverTreino } from '@/lib/treinos/descricao'
import { MODALIDADES, TIPOS_SESSAO } from '@/lib/treinos/tipos'
import { formatDate } from '@/lib/utils'
import MarcarSituacao from '@/components/portal/MarcarSituacao'
import ComparativoTreino, { type ExecucaoView } from '@/components/treinos/ComparativoTreino'
import { metricasPlanejadas } from '@/lib/treinos/calculos'
import { alvoPrincipal } from '@/lib/treinos/descricao'
import { somarDias } from '@/lib/treinos/datas'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

const COR_SECAO: Record<string, string> = {
  warmup: 'border-l-sky-300', work: 'border-l-orange-400', recovery: 'border-l-green-400', cooldown: 'border-l-sky-200',
  drill: 'border-l-purple-400', strength: 'border-l-gray-500', note: 'border-l-amber-300',
}

export default async function TreinoAtletaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { db, atleta } = await atletaLogado()
  if (!atleta) return null
  // Busca pela RLS (publicado e dele/da turma) e aplica a regra do ajuste.
  const { data: s } = await db.from('treino_sessoes').select('data').eq('id', id).maybeSingle()
  if (!s) notFound()
  const treino = (await treinosDoAtleta(db, atleta.aluno, s.data, s.data)).find((t) => t.id === id)
  if (!treino) notFound()

  // Referência (pace/velocidade) do próprio atleta: os testes não são visíveis
  // para ele pela RLS, então lê no servidor, só do atleta logado.
  const [refs, config, { data: entrega }, { data: exRaw }] = await Promise.all([
    referenciasDosAtletas(createAdminClient() as Db, [atleta.aluno.id]),
    getConfigAvaliacao(db),
    db.from('treino_entregas').select('situacao, observacao_atleta').eq('sessao_id', id).eq('aluno_id', atleta.aluno.id).maybeSingle(),
    db.from('treino_execucoes').select('id, origem, titulo, modalidade, executado_em, duracao_s, distancia_m, velocidade_media_ms, pace_medio_s_km, fc_media, fc_max, potencia_media_w, calorias, tss, cadencia_media, elevacao_m, zonas, dados, treino_entregas!inner(sessao_id)')
      .eq('aluno_id', atleta.aluno.id).eq('treino_entregas.sessao_id', id).limit(1),
  ])
  const execucao = exRaw?.[0] ? ({ ...exRaw[0], sessao_id: id } as ExecucaoView) : null
  // Atividades sem treino até 3 dias em volta (para vincular).
  const { data: soltas } = execucao ? { data: [] } : await db.from('treino_execucoes')
    .select('id, origem, titulo, modalidade, executado_em, duracao_s, distancia_m, velocidade_media_ms, pace_medio_s_km, fc_media, fc_max, potencia_media_w, calorias, tss, cadencia_media, elevacao_m, zonas, dados')
    .eq('aluno_id', atleta.aluno.id).is('entrega_id', null)
    .gte('executado_em', `${somarDias(s.data, -3)}T00:00:00-03:00`).lt('executado_em', `${somarDias(s.data, 4)}T00:00:00-03:00`)
  const candidatas = ((soltas ?? []) as ExecucaoView[]).map((c) => ({ ...c, sessao_id: null }))
  const r = refs.get(atleta.aluno.id)
  const referencia = r ? referenciaDe(r, treino.modalidade) : null
  const linhas = descreverTreino(treino.passos, treino.modalidade, { referencia, limites: config.zona_limites, fcMax: r?.fcMax })
  const plano = referencia ? metricasPlanejadas(treino.passos, referencia, {}, config.zona_limites) : null

  return (
    <div className="space-y-4">
      <Link href={`/portal?data=${treino.data}`} className="inline-flex items-center gap-1 text-sm text-gray-500"><ArrowLeft size={14} /> Semana</Link>
      <div>
        <p className="text-xs text-gray-400">{formatDate(treino.data)} · {MODALIDADES[treino.modalidade]} · {TIPOS_SESSAO[treino.tipo]}</p>
        <h1 className="text-xl font-bold text-navy-500 flex items-center gap-2">{treino.titulo}{treino.chave && <Star size={16} className="text-amber-400 fill-amber-400" />}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {/* Estimativa no pace DO atleta (igual ao comparativo); sem referência, a gravada no treino. */}
          {(() => {
            const min = plano?.duracao_s ? Math.round(plano.duracao_s / 60) : treino.duracao_min
            const km = plano?.distancia_km ?? treino.distancia_km
            return `${min ? `${min} min` : ''}${km && treino.modalidade !== 'strength' ? ` · ~${Number(km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : ''}`
          })()}
          {treino.local && <span className="inline-flex items-center gap-1 ml-2"><MapPin size={12} />{treino.local}</span>}
        </p>
        {treino.ajustado && <p className="text-xs text-amber-700 mt-1 inline-flex items-center gap-1"><UserCog size={12} /> O treinador ajustou este treino para você.</p>}
      </div>

      <div className="space-y-2">
        {linhas.map((l, i) => (
          <div key={i} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${COR_SECAO[l.secao] ?? ''} p-3`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{l.rotulo}</p>
            <p className="text-sm font-medium text-navy-500 mt-0.5">{l.principal}</p>
            {l.alvo && (
              <p className="text-sm mt-0.5 flex items-center gap-1.5">
                {l.cor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.cor }} />}
                <span className="text-gray-600">{l.alvo}</span>
              </p>
            )}
            {l.notas && <p className="text-xs text-gray-500 mt-1">{l.notas}</p>}
          </div>
        ))}
      </div>
      {treino.notas && <p className="text-sm text-gray-600 bg-amber-50 rounded-xl p-3">{treino.notas}</p>}
      {r && treino.modalidade !== 'strength' && (
        <p className="text-[11px] text-gray-400">Paces calculados pelo seu {r[treino.modalidade as 'running']?.origem === 'limiar' ? 'limiar cadastrado' : r[treino.modalidade as 'running']?.origem === 'teste' ? 'último teste' : 'valor padrão (ainda sem teste)'}.</p>
      )}

      {treino.modalidade !== 'strength' && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-navy-500">Realizado</p>
          <ComparativoTreino sessaoId={treino.id} alunoId={atleta.aluno.id} modalidade={treino.modalidade} execucao={execucao}
            candidatas={candidatas} referencia={referencia} limites={config.zona_limites} titulo={treino.titulo} notas={treino.notas} comentario={entrega?.observacao_atleta ?? null}
            planejado={{
              data: treino.data, duracao_s: plano?.duracao_s ?? (treino.duracao_min ? treino.duracao_min * 60 : null), distancia_km: plano?.distancia_km ?? treino.distancia_km,
              velocidade_ms: plano?.duracao_s && plano.distancia_km ? (plano.distancia_km * 1000) / plano.duracao_s : null,
              carga: treino.carga, passos: treino.passos, alvo: alvoPrincipal(treino.passos, treino.modalidade, { referencia, limites: config.zona_limites }),
            }} />
        </section>
      )}

      <MarcarSituacao sessaoId={treino.id} situacao={entrega?.situacao ?? 'planejado'} observacao={entrega?.observacao_atleta ?? ''} futuro={treino.data > new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })} />
    </div>
  )
}
