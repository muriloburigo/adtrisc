import Link from 'next/link'
import { ChevronLeft, ChevronRight, Star, UserCog } from 'lucide-react'
import { atletaLogado, treinosDoAtleta, type TreinoAtleta } from '@/lib/portalAtleta'
import { MODALIDADES, TIPOS_SESSAO } from '@/lib/treinos/tipos'
import { diaMes, diasDaSemana, hojeISO, NOMES_DIA, somarDias } from '@/lib/treinos/datas'
import { somarSessoes, formatarDuracao } from '@/lib/treinos/calculos'
import SemanaPortal from '@/components/portal/SemanaPortal'
import { MiniBarras } from '@/components/treinos/GraficoIntensidade'
import type { ExecucaoView } from '@/components/treinos/ComparativoTreino'

const SITUACAO: Record<TreinoAtleta['situacao'], { txt: string; cls: string } | null> = {
  planejado: null,
  feito: { txt: 'Feito', cls: 'bg-green-100 text-green-700' },
  parcial: { txt: 'Parcial', cls: 'bg-amber-100 text-amber-700' },
  nao_feito: { txt: 'Não feito', cls: 'bg-red-100 text-red-600' },
}

function CardTreino({ t, destaque = false }: { t: TreinoAtleta; destaque?: boolean }) {
  const s = SITUACAO[t.situacao]
  return (
    <Link href={`/portal/treino/${t.id}`}
      className={`block rounded-xl border p-3 transition-colors ${destaque ? 'bg-navy-500 text-white border-navy-500' : 'bg-white border-gray-200 hover:border-sky-400'}`}>
      <div className="flex items-center gap-2">
        <p className={`font-semibold text-sm flex-1 min-w-0 truncate ${destaque ? '' : 'text-navy-500'}`}>{t.titulo}</p>
        {t.chave && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />}
        {s && <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${s.cls}`}>{s.txt}</span>}
      </div>
      <p className={`text-xs mt-0.5 ${destaque ? 'text-white/70' : 'text-gray-500'}`}>
        {MODALIDADES[t.modalidade]} · {TIPOS_SESSAO[t.tipo]}{t.duracao_min ? ` · ${t.duracao_min} min` : ''}{t.distancia_km ? ` · ${Number(t.distancia_km).toLocaleString('pt-BR')} km` : ''}
      </p>
      {t.ajustado && <p className={`text-[11px] mt-1 inline-flex items-center gap-1 ${destaque ? 'text-amber-300' : 'text-amber-700'}`}><UserCog size={11} /> ajustado para você</p>}
      {t.passos.length > 0 && <MiniBarras passos={t.passos} modalidade={t.modalidade} />}
    </Link>
  )
}

// "Meus treinos": próximo treino em destaque + a semana (mesmos cards do calendário da equipe).
export default async function PortalPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const sp = await searchParams
  const { db, atleta } = await atletaLogado()
  if (!atleta) return null
  const hoje = hojeISO()
  const ancora = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? '') ? sp.data! : hoje
  const dias = diasDaSemana(ancora)
  // Busca a semana mostrada + 14 dias à frente para achar o próximo treino.
  const fimBusca = somarDias(hoje, 14) > dias[6] ? somarDias(hoje, 14) : dias[6]
  const inicioBusca = dias[0] < hoje ? dias[0] : hoje
  const todos = await treinosDoAtleta(db, atleta.aluno, inicioBusca, fimBusca)
  const daSemana = todos.filter((t) => t.data >= dias[0] && t.data <= dias[6])
  const proximo = todos.find((t) => t.data >= hoje && t.situacao === 'planejado')
  const { data: exs } = await db.from('treino_execucoes')
    .select('id, origem, titulo, modalidade, executado_em, duracao_s, distancia_m, velocidade_media_ms, pace_medio_s_km, fc_media, fc_max, potencia_media_w, calorias, tss, cadencia_media, elevacao_m, zonas, dados, ordem, entrega_id, treino_entregas(sessao_id)')
    .eq('aluno_id', atleta.aluno.id).gte('executado_em', `${somarDias(dias[0], -3)}T00:00:00-03:00`).lt('executado_em', `${somarDias(dias[6], 1)}T00:00:00-03:00`)
  type Ex = ExecucaoView & { entrega_id: string | null; treino_entregas: { sessao_id: string } | null }
  const execucoes: Record<string, ExecucaoView> = {}
  const extras: ExecucaoView[] = []
  for (const { treino_entregas, entrega_id, ...e } of (exs ?? []) as Ex[]) {
    const sessao = entrega_id ? treino_entregas?.sessao_id ?? null : null
    if (sessao) execucoes[sessao] = { ...e, sessao_id: sessao }
    else if (!entrega_id) extras.push({ ...e, sessao_id: null })
  }
  const tot = somarSessoes(daSemana)
  const feitos = daSemana.filter((t) => t.situacao === 'feito' || t.situacao === 'parcial').length
  const passados = daSemana.filter((t) => t.data < hoje).length

  return (
    <div className="space-y-4">
      {proximo && (
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
            {proximo.data === hoje ? 'Treino de hoje' : `Próximo treino · ${NOMES_DIA[(new Date(`${proximo.data}T12:00:00Z`).getUTCDay() + 6) % 7]} ${diaMes(proximo.data)}`}
          </p>
          <CardTreino t={proximo} destaque />
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center gap-1">
          <Link href={`/portal?data=${somarDias(ancora, -7)}`} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><ChevronLeft size={18} /></Link>
          <p className="text-sm font-semibold text-navy-500 flex-1 text-center">Semana {diaMes(dias[0])} a {diaMes(dias[6])}</p>
          {ancora !== hoje && <Link href="/portal" className="text-xs text-sky-600 px-2">hoje</Link>}
          <Link href={`/portal?data=${somarDias(ancora, 7)}`} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"><ChevronRight size={18} /></Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white rounded-xl border border-gray-200 py-2"><p className="text-[11px] text-gray-400">Treinos</p><p className="font-semibold text-navy-500">{daSemana.length}</p></div>
          <div className="bg-white rounded-xl border border-gray-200 py-2"><p className="text-[11px] text-gray-400">Tempo</p><p className="font-semibold text-navy-500">{formatarDuracao(tot.duracao_min * 60)}</p></div>
          <div className="bg-white rounded-xl border border-gray-200 py-2"><p className="text-[11px] text-gray-400">Feitos</p><p className="font-semibold text-navy-500">{feitos}/{passados || daSemana.length}</p></div>
        </div>
        {/* No computador a semana vira grade de 7 colunas (mais larga que o resto do portal). */}
        <div className="lg:relative lg:left-1/2 lg:-translate-x-1/2 lg:w-[min(72rem,calc(100vw-2rem))]">
          <SemanaPortal alunoId={atleta.aluno.id} dias={dias} hoje={hoje} execucoes={execucoes} extras={extras}
            treinos={daSemana.map((t) => ({ ...t, status: 'publicado' as const, origem: t.ajustado ? 'ajuste' as const : 'turma' as const, nAjustes: 0 }))}
            todos={todos.map((t) => ({ id: t.id, data: t.data, titulo: t.titulo, modalidade: t.modalidade, duracao_min: t.duracao_min, distancia_km: t.distancia_km }))} />
        </div>
      </section>
    </div>
  )
}
