'use client'

import { useMemo } from 'react'
import { pointerWithin, rectIntersection, useDraggable, useDroppable, type CollisionDetection } from '@dnd-kit/core'
import { Star, UserCog, User, MessageSquare, Footprints, Bike, Waves, Dumbbell, Activity, EyeOff } from 'lucide-react'
import type { ExecucaoView } from './ComparativoTreino'
import { MiniBarras } from './GraficoIntensidade'
import { descreverTreino } from '@/lib/treinos/descricao'
import { formatarDuracao } from '@/lib/treinos/calculos'
import type { Modalidade, Passo, TipoSessao } from '@/lib/treinos/tipos'

// Cards do calendário de treinos, usados pela equipe (/treinos) e pelo atleta (portal).

/** O que o card precisa saber do treino (SessaoCalendario e o treino do portal servem). */
export type TreinoCard = {
  id: string; data: string; titulo: string; tipo: TipoSessao; modalidade: Modalidade; chave: boolean
  status: 'rascunho' | 'publicado'; oculto?: boolean
  duracao_min: number | null; distancia_km: number | null; carga: number | null; passos: Passo[]
  origem: 'turma' | 'ajuste' | 'individual'; nAjustes: number
  situacao?: 'planejado' | 'feito' | 'nao_feito' | 'parcial'; obsAtleta?: string | null
}

// Solta onde está o ponteiro (não onde o card largo encosta). Prioridade:
// fenda entre cards (trocar a ordem) > card (vincular/reordenar) > dia.
const PESO = (id: string) => (id.startsWith('o:') ? 2 : id.startsWith('sd:') ? 1 : 0)
export const colisao: CollisionDetection = (args) => {
  const sob = pointerWithin(args)
  const lista = sob.length ? sob : rectIntersection(args)
  return [...lista].sort((a, b) => PESO(String(b.id)) - PESO(String(a.id)))
}

// Card no padrão do TrainingPeaks: faixa colorida no topo — verde = planejado COM
// atividade vinculada (80–120% do planejado); amarelo = vinculado, mas fora dessa faixa;
// vermelho = planejado SEM vínculo e com data anterior a hoje;
// cinza = feito sem plano (extra) —, ícone + título, números em negrito (realizado
// com ✓; senão o planejado), linhas "P:" com o planejado, descrição curta e barras.
export type Status = 'feito' | 'desvio' | 'perdido' | null
const TOPO_STATUS: Record<Exclude<Status, null>, string> = { feito: 'bg-green-500', desvio: 'bg-amber-300', perdido: 'bg-red-500' }
const FUNDO_STATUS: Record<Exclude<Status, null>, string> = { feito: 'bg-green-50 border-green-200', desvio: 'bg-amber-50 border-amber-200', perdido: 'bg-red-50 border-red-200' }

/**
 * Executado ÷ planejado na medida que o treinador definiu: treino montado por
 * distância compara a distância; por tempo, a duração (a outra é estimativa).
 * Fora de 80%–120% → amarelo.
 */
export function proporcaoExecutada(s: TreinoCard, r: ExecucaoView): number | null {
  const esforco = s.passos.filter((p) => p.tipo !== 'note' && p.tipo !== 'warmup' && p.tipo !== 'cooldown')
  const porDistancia = esforco.length > 0 && esforco.every((p) => p.distancia_m && !p.duracao_s)
  const plan = porDistancia ? (s.distancia_km ? Number(s.distancia_km) * 1000 : null) : (s.duracao_min ? s.duracao_min * 60 : null)
  const real = porDistancia ? (r.distancia_m ? Number(r.distancia_m) : null) : r.duracao_s
  if (!plan || !real) {
    const pd = s.duracao_min ? s.duracao_min * 60 : null
    return pd && r.duracao_s ? r.duracao_s / pd : null
  }
  return real / plan
}

/**
 * Cor do card na visão do atleta (só treino publicado e visível). Sem atividade,
 * vale o que o atleta marcou à mão (natação sem relógio, por exemplo): feito → verde,
 * parcial → amarelo; sem marcação (ou "não fiz") e com data passada → vermelho.
 */
export function statusDoTreino(s: TreinoCard, realizado: ExecucaoView | null | undefined, hoje: string): Status {
  if (s.status !== 'publicado' || s.oculto) return null
  if (realizado) {
    const p = proporcaoExecutada(s, realizado)
    return p !== null && (p < 0.8 || p > 1.2) ? 'desvio' : 'feito'
  }
  if (s.situacao === 'feito') return 'feito'
  if (s.situacao === 'parcial') return 'desvio'
  return s.data < hoje ? 'perdido' : null
}

const TOPO_TIPO: Record<string, string> = {
  base: 'bg-sky-300', long: 'bg-indigo-300', interval: 'bg-orange-300', recovery: 'bg-green-300', technique: 'bg-purple-300',
  strength: 'bg-gray-400', race_simulation: 'bg-red-300', brick: 'bg-amber-300',
}
const ICONE_MOD: Record<string, typeof Footprints> = { running: Footprints, cycling: Bike, swimming: Waves, strength: Dumbbell, other: Activity }
const COR_ICONE: Record<string, string> = { running: 'text-green-600', cycling: 'text-purple-600', swimming: 'text-sky-600', strength: 'text-gray-600', other: 'text-gray-500' }
const fmtKm = (km: number | null | undefined) => (km ? `${Number(km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}` : null)

function Cabeca({ modalidade, titulo, chave, oculto }: { modalidade: string; titulo: string; chave?: boolean; oculto?: boolean }) {
  const Icone = ICONE_MOD[modalidade] ?? Activity
  return (
    <>
      <div className="flex items-center gap-1"><Icone size={15} className={COR_ICONE[modalidade] ?? 'text-gray-500'} />{chave && <Star size={10} className="ml-auto text-amber-500 fill-amber-400" />}</div>
      <p className={`text-[11px] font-semibold leading-tight line-clamp-2 mt-0.5 ${oculto ? 'text-gray-500' : 'text-navy-500'}`}>{oculto && <EyeOff size={11} className="inline mr-1 -mt-0.5" />}{titulo}</p>
    </>
  )
}

export function CardSessao({ s, arrastavel, onAbrir, realizado, status = null, rotuloAjuste = 'ajustado' }: {
  s: TreinoCard; arrastavel: boolean; onAbrir: () => void; realizado?: ExecucaoView | null; status?: Status; rotuloAjuste?: string
}) {
  // Treino com atividade vinculada = um card só. Arrastar move a atividade realizada.
  const { setNodeRef: refArrasto, listeners, attributes, isDragging } = useDraggable({ id: realizado ? `x:${realizado.id}` : `s:${s.id}`, disabled: !realizado && !arrastavel })
  const { setNodeRef: refAlvo, isOver } = useDroppable({ id: `sd:${s.id}`, data: { data: s.data } })
  const planDur = s.duracao_min ? formatarDuracao(s.duracao_min * 60) : null
  const descricao = useMemo(() => descreverTreino(s.passos, s.modalidade).filter((l) => l.principal).slice(0, 3)
    .map((l) => `${l.principal}${l.alvo ? ` ${l.alvo.split(' (')[0].split(' · ')[0]}` : ''}`), [s.passos, s.modalidade])
  return (
    <div ref={refAlvo} className={isOver ? 'rounded-lg ring-2 ring-sky-400' : ''}>
      <button ref={refArrasto} type="button" onClick={onAbrir} {...listeners} {...attributes}
        title={realizado ? 'Treino realizado. Arraste para outro treino (troca o vínculo), entre os cards (muda a ordem) ou para outro dia (vira extra).' : undefined}
        className={`w-full text-left rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${s.oculto ? 'bg-gray-100 border-gray-200 opacity-65' : status ? FUNDO_STATUS[status] : 'bg-white border-gray-200'} ${!status && s.status === 'rascunho' ? 'border-dashed opacity-80' : ''} ${isDragging ? 'opacity-30' : ''} ${realizado || arrastavel ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <div className={`h-1.5 ${s.oculto ? 'bg-gray-300' : status ? TOPO_STATUS[status] : TOPO_TIPO[s.tipo] ?? 'bg-gray-300'}`} />
        <div className="px-2 pt-1.5 pb-1">
          <Cabeca modalidade={s.modalidade} titulo={s.titulo} chave={s.chave} oculto={s.oculto} />
          <div className="mt-1 text-[11px] font-bold text-navy-500 leading-snug tabular-nums">
            {realizado ? (
              <>
                {realizado.duracao_s ? <p>{formatarDuracao(realizado.duracao_s)} <span className="text-green-600">✓</span></p> : null}
                {realizado.distancia_m ? <p>{fmtKm(Number(realizado.distancia_m) / 1000)} <span className="font-normal">km</span></p> : null}
                {realizado.tss ? <p>{Math.round(realizado.tss)} <span className="font-normal">carga</span></p> : null}
              </>
            ) : (
              <>
                {planDur && <p>{planDur}</p>}
                {fmtKm(s.distancia_km) && <p>{fmtKm(s.distancia_km)} <span className="font-normal">km</span></p>}
                {s.carga ? <p>{Math.round(Number(s.carga))} <span className="font-normal">carga</span></p> : null}
              </>
            )}
          </div>
          {realizado && (planDur || s.distancia_km || s.carga) ? (
            <div className="mt-0.5 text-[10px] text-gray-500 leading-snug tabular-nums">
              {planDur && <p>P: {planDur}</p>}
              {fmtKm(s.distancia_km) && <p>P: {fmtKm(s.distancia_km)} km</p>}
              {s.carga ? <p>P: {Math.round(Number(s.carga))} carga</p> : null}
            </div>
          ) : null}
          {descricao.length > 0 && <div className="mt-1 text-[10px] text-gray-600 leading-snug">{descricao.map((d, i) => <p key={i} className="truncate">{d}</p>)}</div>}
          <div className="flex flex-wrap gap-1 mt-1">
            {s.status === 'rascunho' && <span className="text-[9px] font-semibold text-gray-500 bg-gray-100 rounded px-1">rascunho</span>}
            {s.origem === 'ajuste' && <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 rounded px-1 inline-flex items-center gap-0.5"><UserCog size={9} />{rotuloAjuste}</span>}
            {s.origem === 'individual' && <span className="text-[9px] font-semibold text-sky-700 bg-sky-100 rounded px-1 inline-flex items-center gap-0.5"><User size={9} />individual</span>}
            {s.nAjustes > 0 && <span className="text-[9px] text-amber-700">{s.nAjustes} ajuste{s.nAjustes > 1 ? 's' : ''}</span>}
            {!realizado && s.situacao && s.situacao !== 'planejado' && (
              <span className="text-[9px] font-semibold text-gray-600 bg-white/80 rounded px-1">{s.situacao === 'feito' ? '✓ marcado feito' : s.situacao === 'parcial' ? 'marcado parcial' : '✗ não fez'}</span>
            )}
            {s.obsAtleta && <span title={s.obsAtleta} className="text-[9px] text-sky-700 inline-flex items-center gap-0.5"><MessageSquare size={9} />comentou</span>}
          </div>
        </div>
        {s.passos.length > 0 && <div className="px-1.5 pb-1"><MiniBarras passos={s.passos} modalidade={s.modalidade} /></div>}
      </button>
    </div>
  )
}

/** Atividade extra (feita sem treino): cinza. Arraste sobre um treino para vincular, entre os cards ou para outro dia. */
export function CardExtra({ x, onAbrir }: { x: ExecucaoView; onAbrir: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `x:${x.id}` })
  return (
    <button ref={setNodeRef} type="button" onClick={onAbrir} {...listeners} {...attributes}
      title="Atividade sem treino planejado. Arraste sobre um treino para vincular."
      className={`w-full text-left rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}>
      <div className="h-1.5 bg-gray-300" />
      <div className="px-2 pt-1.5 pb-1.5">
        <Cabeca modalidade={x.modalidade ?? 'other'} titulo={x.titulo ?? 'Atividade'} />
        <div className="mt-1 text-[11px] font-bold text-navy-500 leading-snug tabular-nums">
          {x.duracao_s ? <p>{formatarDuracao(x.duracao_s)}</p> : null}
          {x.distancia_m ? <p>{fmtKm(Number(x.distancia_m) / 1000)} <span className="font-normal">km</span></p> : null}
          {x.tss ? <p>{Math.round(x.tss)} <span className="font-normal">carga</span></p> : null}
        </div>
        <p className="text-[9px] text-gray-400 mt-0.5">sem treino planejado</p>
      </div>
    </button>
  )
}

/**
 * Fenda entre os cards de um dia: soltar aqui coloca o card nessa posição.
 * Só existe durante o arrasto e fica por cima da junção (não empurra o layout).
 */
export function Fenda({ dia, pos, fim = false }: { dia: string; pos: number; fim?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `o:${dia}:${pos}`, data: { data: dia, pos } })
  return (
    <div ref={setNodeRef} className={`absolute inset-x-0 z-10 h-4 ${fim ? '-bottom-3' : '-top-2.5'}`}>
      {isOver && <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-sky-400 shadow-[0_0_0_2px_rgba(42,171,225,.25)]" />}
    </div>
  )
}

/** Cards de um dia com as fendas de reordenar (quando há arrasto). `itens` já na ordem. */
export function ListaDoDia<T>({ dia, itens, chave, arrastando, render }: {
  dia: string; itens: T[]; chave: (t: T) => string; arrastando: boolean; render: (t: T) => React.ReactNode
}) {
  return (
    <div className="relative space-y-1">
      {itens.map((t, i) => (
        <div key={chave(t)} className="relative">
          {arrastando && <Fenda dia={dia} pos={i} />}
          {render(t)}
        </div>
      ))}
      {arrastando && itens.length > 0 && <Fenda dia={dia} pos={itens.length} fim />}
    </div>
  )
}

/** Nova ordem ao soltar `id` na posição `pos` (índice da fenda em `ids`). Nulo = não mudou. */
export function reposicionar(ids: string[], id: string, pos: number): string[] | null {
  const de = ids.indexOf(id)
  const sem = ids.filter((x) => x !== id)
  const alvo = de >= 0 && de < pos ? pos - 1 : pos
  sem.splice(Math.max(0, Math.min(alvo, sem.length)), 0, id)
  return de >= 0 && sem.every((x, i) => x === ids[i]) ? null : sem
}

/** Ordem pessoal do dia (visão do atleta): treinos pela ordem do atleta (ou da turma), extras depois pela hora. */
export function chaveOrdemExtra(x: ExecucaoView & { ordem?: number | null }): number {
  if (x.ordem != null) return Number(x.ordem)
  const h = new Date(x.executado_em)
  return 100 + (h.getUTCHours() * 60 + h.getUTCMinutes()) / 10_000
}
