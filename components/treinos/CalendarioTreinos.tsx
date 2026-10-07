'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus, Send, Star, UserCog, User, Library, CopyPlus, Search, X, Folder, MessageSquare } from 'lucide-react'
import MontadorTreino, { type AtletaRef, type EntregaRef, type SessaoView } from './MontadorTreino'
import type { ExecucaoView } from './ComparativoTreino'
import ExtraModal from './ExtraModal'
import { similaridade } from '@/lib/intervals/atividade'
import { CardExtra, CardSessao, ListaDoDia, chaveOrdemExtra, colisao, reposicionar, statusDoTreino } from './CardsCalendario'
import { somarSessoes, formatarDuracao } from '@/lib/treinos/calculos'
import { MODALIDADES, TIPOS_SESSAO, type Modalidade, type TipoSessao } from '@/lib/treinos/tipos'
import { NOMES_DIA, diaMes, hojeISO, mesAnterior, rotuloMes, somarDias } from '@/lib/treinos/datas'
import { publicarPeriodo } from '@/app/(dashboard)/treinos/actions'
import { moverSessao, reordenarDia, usarModelo, duplicarSemana } from '@/app/(dashboard)/treinos/biblioteca-actions'
import { moverAtividade, ordenarDiaDoAtleta, vincularAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'

export type SessaoCalendario = SessaoView & {
  origem: 'turma' | 'ajuste' | 'individual'
  nAjustes: number
  situacao?: 'planejado' | 'feito' | 'nao_feito' | 'parcial'   // só na visão do atleta
  obsAtleta?: string | null
  ordemAtleta?: number | null   // ordem pessoal no dia (entrega), só na visão do atleta
}
export type ModeloResumo = { id: string; titulo: string; modalidade: Modalidade; tipo: TipoSessao; duracao_min: number | null; distancia_km: number | null; pasta_id: string | null }
export type Biblioteca = { pastas: { id: string; nome: string }[]; modelos: ModeloResumo[] }

const COR_TIPO: Record<string, string> = {
  base: 'bg-sky-50 border-sky-200', long: 'bg-indigo-50 border-indigo-200', interval: 'bg-orange-50 border-orange-200',
  recovery: 'bg-green-50 border-green-200', technique: 'bg-purple-50 border-purple-200', strength: 'bg-gray-100 border-gray-300',
  race_simulation: 'bg-red-50 border-red-200', brick: 'bg-amber-50 border-amber-200',
}
const SIGLA_MOD: Record<string, string> = { running: 'C', cycling: 'B', swimming: 'N', strength: 'F', other: '•' }

function ConteudoCard({ s }: { s: SessaoCalendario }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <span className="shrink-0 w-4 h-4 rounded bg-navy-500 text-white text-[9px] font-bold flex items-center justify-center" title={MODALIDADES[s.modalidade]}>{SIGLA_MOD[s.modalidade]}</span>
        <span className="text-xs font-semibold text-navy-500 truncate">{s.titulo}</span>
        {s.chave && <Star size={10} className="shrink-0 text-amber-500 fill-amber-400" />}
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
        {TIPOS_SESSAO[s.tipo]}{s.duracao_min ? ` · ${s.duracao_min} min` : ''}{s.distancia_km ? ` · ${Number(s.distancia_km).toLocaleString('pt-BR')} km` : ''}
      </p>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {s.status === 'rascunho' && <span className="text-[9px] font-semibold text-gray-500 bg-white/80 rounded px-1">rascunho</span>}
        {s.origem === 'ajuste' && <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 rounded px-1 inline-flex items-center gap-0.5"><UserCog size={9} />ajustado</span>}
        {s.origem === 'individual' && <span className="text-[9px] font-semibold text-sky-700 bg-sky-100 rounded px-1 inline-flex items-center gap-0.5"><User size={9} />individual</span>}
        {s.nAjustes > 0 && <span className="text-[9px] text-amber-700">{s.nAjustes} ajuste{s.nAjustes > 1 ? 's' : ''}</span>}
        {s.situacao === 'feito' && <span className="text-[9px] font-semibold text-green-700 bg-green-100 rounded px-1">✓ feito</span>}
        {s.situacao === 'parcial' && <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 rounded px-1">parcial</span>}
        {s.situacao === 'nao_feito' && <span className="text-[9px] font-semibold text-red-600 bg-red-100 rounded px-1">✗ não feito</span>}
        {s.obsAtleta && <span title={s.obsAtleta} className="text-[9px] text-sky-700 inline-flex items-center gap-0.5"><MessageSquare size={9} />comentou</span>}
      </div>
    </>
  )
}

function CelulaDia({ d, children, destaque, vista, foraMes, onMais, selecionandoModelo }: {
  d: string; children: React.ReactNode; destaque: boolean; vista: string; foraMes: boolean; onMais: () => void; selecionandoModelo: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `d:${d}` })
  return (
    <div ref={setNodeRef} className={`rounded-xl border p-1.5 ${vista === 'semana' ? 'min-h-[220px]' : 'min-h-[110px]'} ${isOver ? 'border-sky-400 bg-sky-50' : destaque ? 'border-sky-400 bg-sky-50/40' : 'border-gray-200 bg-white'} ${foraMes ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[11px] font-semibold ${destaque ? 'text-sky-600' : 'text-gray-400'}`}>{diaMes(d)}</span>
        <button onClick={onMais} title={selecionandoModelo ? 'Colocar o modelo aqui' : 'Adicionar treino'}
          className={`p-0.5 rounded ${selecionandoModelo ? 'text-white bg-sky-400 animate-pulse' : 'text-gray-300 hover:text-sky-500 hover:bg-sky-50'}`}><Plus size={14} /></button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function CardModelo({ m, selecionado, onSelecionar }: { m: ModeloResumo; selecionado: boolean; onSelecionar: () => void }) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `m:${m.id}` })
  return (
    <button ref={setNodeRef} type="button" onClick={onSelecionar} {...listeners} {...attributes}
      className={`w-full text-left rounded-lg border px-2 py-1.5 cursor-grab ${COR_TIPO[m.tipo] ?? 'bg-white border-gray-200'} ${selecionado ? 'ring-2 ring-sky-400' : ''} ${isDragging ? 'opacity-30' : ''}`}>
      <p className="text-xs font-semibold text-navy-500 truncate">{m.titulo}</p>
      <p className="text-[10px] text-gray-500">{MODALIDADES[m.modalidade]} · {TIPOS_SESSAO[m.tipo]}{m.duracao_min ? ` · ${m.duracao_min} min` : ''}</p>
    </button>
  )
}

export default function CalendarioTreinos({
  escopo, vista, ancora, semanas, sessoes: sessoesProp, atletas, ajustesPorSessao, limites, biblioteca, entregasPorSessao = {}, execucoesPorSessao: execProp = {}, extras: extrasProp = [],
}: {
  execucoesPorSessao?: Record<string, ExecucaoView>
  extras?: ExecucaoView[]
  entregasPorSessao?: Record<string, Record<string, EntregaRef>>
  escopo: { tipo: 'turma' | 'aluno'; id: string; nome: string }
  vista: 'semana' | 'mes'
  ancora: string
  semanas: string[][]
  sessoes: SessaoCalendario[]
  atletas: AtletaRef[]
  ajustesPorSessao: Record<string, Record<string, string>>
  limites: number[]
  biblioteca: Biblioteca
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [aberto, setAberto] = useState<{ sessaoId?: string; novoData?: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [painel, setPainel] = useState(false)
  const [busca, setBusca] = useState('')
  const [modeloSel, setModeloSel] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [extraAberta, setExtraAberta] = useState<ExecucaoView | null>(null)
  // Estado otimista: arrastar mostra o resultado na hora; o servidor confirma por trás
  // (ao terminar a ação, volta a valer o que veio do servidor — inclusive se der erro).
  type Otimista = { sessoes: SessaoCalendario[]; extras: ExecucaoView[]; exec: Record<string, ExecucaoView> }
  type Acao =
    | { t: 'moverSessao'; id: string; data: string }
    | { t: 'ordem'; ids: string[] }
    | { t: 'ordemAtleta'; itens: string[] }
    | { t: 'vincular'; exec: string; sessao: string }
    | { t: 'moverAtividade'; exec: string; data: string }
    | { t: 'modelo'; data: string; titulo: string; modalidade: Modalidade; tipo: TipoSessao }
  const [ot, aplicar] = useOptimistic<Otimista, Acao>({ sessoes: sessoesProp, extras: extrasProp, exec: execProp }, (st, a) => {
    switch (a.t) {
      case 'moverSessao':
        return { ...st, sessoes: st.sessoes.map((x) => (x.id === a.id || x.sessao_origem_id === a.id ? { ...x, data: a.data, ordem: x.id === a.id ? 99 : x.ordem } : x)) }
      case 'ordem':
        return { ...st, sessoes: st.sessoes.map((x) => (a.ids.includes(x.id) ? { ...x, ordem: a.ids.indexOf(x.id) + 1 } : x)) }
      case 'ordemAtleta': {
        const pos = (k: string) => a.itens.indexOf(k) + 1
        return {
          ...st,
          sessoes: st.sessoes.map((x) => (a.itens.includes(`s:${x.id}`) ? { ...x, ordemAtleta: pos(`s:${x.id}`) } : x)),
          extras: st.extras.map((x) => (a.itens.includes(`x:${x.id}`) ? { ...x, ordem: pos(`x:${x.id}`) } : x)),
        }
      }
      case 'vincular': {
        const ex = st.extras.find((e) => e.id === a.exec) ?? Object.values(st.exec).find((e) => e.id === a.exec)
        if (!ex) return st
        const exec = Object.fromEntries(Object.entries(st.exec).filter(([, e]) => e.id !== a.exec))
        exec[a.sessao] = { ...ex, sessao_id: a.sessao, dados: { ...(ex.dados ?? {}), vinculo: { modo: 'manual' } } }
        return { ...st, extras: st.extras.filter((e) => e.id !== a.exec), exec }
      }
      case 'moverAtividade': {
        const vinc = Object.entries(st.exec).find(([, e]) => e.id === a.exec)
        const ex = vinc?.[1] ?? st.extras.find((e) => e.id === a.exec)
        if (!ex) return st
        const movida = { ...ex, sessao_id: null, executado_em: `${a.data}T12:00:00-03:00` }
        return {
          ...st,
          exec: vinc ? Object.fromEntries(Object.entries(st.exec).filter(([k]) => k !== vinc[0])) : st.exec,
          extras: [...st.extras.filter((e) => e.id !== a.exec), movida],
        }
      }
      case 'modelo':
        return { ...st, sessoes: [...st.sessoes, {
          id: `tmp-${a.data}-${st.sessoes.length}`, turma_id: null, aluno_id: null, sessao_origem_id: null, data: a.data, ordem: 99, titulo: a.titulo,
          tipo: a.tipo, modalidade: a.modalidade, local: null, chave: false, notas: null, status: 'rascunho', duracao_min: null, distancia_km: null, carga: null,
          passos: [], origem: escopo.tipo === 'turma' ? 'turma' : 'individual', nAjustes: 0,
        } as SessaoCalendario] }
    }
  })
  const sessoes = ot.sessoes, extras = ot.extras, execucoesPorSessao = ot.exec
  const diaLocal = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const hoje = hojeISO()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )
  const escopoAcao = escopo.tipo === 'turma' ? { turma_id: escopo.id } : { aluno_id: escopo.id }

  const ir = (p: Record<string, string>) => {
    const q = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(p)) q.set(k, v)
    router.push(`${pathname}?${q}`, { scroll: false })
  }
  const anterior = vista === 'semana' ? somarDias(ancora, -7) : mesAnterior(ancora, -1)
  const proximo = vista === 'semana' ? somarDias(ancora, 7) : mesAnterior(ancora, 1)
  const de = semanas[0][0], ate = semanas[semanas.length - 1][6]
  // Na visão da turma, os ajustes individuais vêm junto (para abrir pela aba Atletas), mas não entram na grade.
  const naGrade = escopo.tipo === 'turma' ? sessoes.filter((s) => s.origem !== 'ajuste') : sessoes
  const porDia = (d: string) => naGrade.filter((s) => s.data === d).sort((a, b) => a.ordem - b.ordem)
  // Cards do dia na ordem: na turma, a ordem da turma; no atleta, a ordem pessoal
  // dele (treinos e extras misturados; sem ordem pessoal, extras vão depois, pela hora).
  type Item = { k: string; s?: SessaoCalendario; x?: ExecucaoView; o: number }
  const itensDoDia = (d: string): Item[] => {
    const ss = porDia(d)
    if (escopo.tipo !== 'aluno') return ss.map((s) => ({ k: `s:${s.id}`, s, o: s.ordem }))
    return [
      ...ss.map((s) => ({ k: `s:${s.id}`, s, o: Number(s.ordemAtleta ?? s.ordem) })),
      ...extras.filter((x) => diaLocal(x.executado_em) === d).map((x) => ({ k: `x:${x.id}`, x, o: chaveOrdemExtra(x) })),
    ].sort((a, b) => a.o - b.o)
  }
  const rascunhos = naGrade.filter((s) => s.status === 'rascunho').length
  const sessaoAberta = aberto?.sessaoId ? sessoes.find((s) => s.id === aberto.sessaoId) ?? null : null
  // Trocar de dia: treino da turma só na visão da turma; ajustes acompanham o da turma.
  // Trocar a ordem no dia: qualquer card na visão do atleta (é a ordem pessoal dele).
  const mudaDia = (s: SessaoCalendario) => (escopo.tipo === 'turma' ? s.origem === 'turma' : s.origem === 'individual')
  const arrastavel = (s: SessaoCalendario) => escopo.tipo === 'aluno' || mudaDia(s)

  const modelosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return biblioteca.modelos.filter((m) => !b || m.titulo.toLowerCase().includes(b))
  }, [busca, biblioteca.modelos])

  const executar = (fn: () => Promise<{ error?: string }>, ok?: string, otimista?: Acao | Acao[]) => startTransition(async () => {
    for (const o of [otimista ?? []].flat()) aplicar(o)
    const r = await fn()
    setMsg(r.error ?? ok ?? null)
    router.refresh()
  })

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null)
    const a = String(e.active.id), o = e.over ? String(e.over.id) : null
    if (!o) return
    const diaDestino = o.startsWith('d:') ? o.slice(2) : (e.over?.data.current?.data as string | undefined)
    if (!diaDestino) return
    if (a.startsWith('m:')) {
      const m = biblioteca.modelos.find((x) => x.id === a.slice(2))
      return executar(() => usarModelo(a.slice(2), diaDestino, escopoAcao), 'Modelo colocado no calendário (rascunho).',
        m ? { t: 'modelo', data: diaDestino, titulo: m.titulo, modalidade: m.modalidade, tipo: m.tipo } : undefined)
    }
    const doAtleta = escopo.tipo === 'aluno'
    // O card arrastado na lista do dia: atividade vinculada = o card do treino.
    const exec = a.startsWith('x:') ? a.slice(2) : null
    const vinculada = exec ? Object.entries(execucoesPorSessao).find(([, e]) => e.id === exec) : undefined
    const k = vinculada ? `s:${vinculada[0]}` : a
    const s = k.startsWith('s:') ? sessoes.find((x) => x.id === k.slice(2)) : null
    const extra = exec && !vinculada ? extras.find((x) => x.id === exec) : null
    if (!s && !extra) return
    const diaOrigem = s ? s.data : diaLocal(extra!.executado_em)

    // Atividade solta sobre um treino → vincula.
    if (exec && o.startsWith('sd:')) {
      const alvo = sessoes.find((x) => x.id === o.slice(3))
      if (vinculada?.[0] === alvo?.id) return
      if (alvo && execucoesPorSessao[alvo.id]) return setMsg('Esse treino já tem uma atividade. Desvincule a atual no comparativo antes.')
      return executar(() => vincularAtividade(exec, o.slice(3)), `Atividade vinculada a “${alvo?.titulo ?? 'treino'}”.`, { t: 'vincular', exec, sessao: o.slice(3) })
    }

    // Posição no dia de destino: na fenda; sobre um treino, antes dele; no dia, no fim.
    const ids = itensDoDia(diaDestino).map((i) => i.k)
    const pos = o.startsWith('o:') ? Number(e.over?.data.current?.pos ?? ids.length) : o.startsWith('sd:') ? Math.max(0, ids.indexOf(`s:${o.slice(3)}`)) : ids.length
    const acaoOrdem = (nova: string[]): Acao => (doAtleta ? { t: 'ordemAtleta', itens: nova } : { t: 'ordem', ids: nova.map((i) => i.slice(2)) })
    const gravarOrdem = (nova: string[]) => (doAtleta ? ordenarDiaDoAtleta(escopo.id, nova) : reordenarDia(nova.map((i) => i.slice(2))))

    if (diaOrigem === diaDestino) {
      const nova = reposicionar(ids, k, pos)
      if (!nova) return
      return executar(() => gravarOrdem(nova), undefined, acaoOrdem(nova))
    }

    // Outro dia. Atividade (extra ou vinculada): muda a data e vira extra lá.
    if (exec) {
      const nova = [...ids]
      nova.splice(pos, 0, `x:${exec}`)
      return executar(async () => {
        const r = await moverAtividade(exec, diaDestino)
        return r.error ? r : gravarOrdem(nova)
      }, vinculada ? 'Atividade movida de dia (saiu do treino e ficou como extra).' : 'Atividade movida de dia.', [{ t: 'moverAtividade', exec, data: diaDestino }, acaoOrdem(nova)])
    }
    if (!s) return
    if (!mudaDia(s)) return setMsg(escopo.tipo === 'aluno' ? 'Treino da turma (e o ajuste dele) muda de dia na visão da turma. Aqui dá para trocar a ordem dentro do dia.' : 'Esse treino não muda de dia por aqui.')
    const nova = [...ids]
    nova.splice(pos, 0, k)
    const soMover = !doAtleta && o.startsWith('d:')   // a turma já entra no fim do dia
    return executar(async () => {
      const r = await moverSessao(s.id, diaDestino)
      return r.error || soMover ? r : gravarOrdem(nova)
    }, undefined, soMover ? { t: 'moverSessao', id: s.id, data: diaDestino } : [{ t: 'moverSessao', id: s.id, data: diaDestino }, acaoOrdem(nova)])
  }

  function maisNoDia(d: string) {
    if (modeloSel) {
      const m = modeloSel
      setModeloSel(null)
      const mod = biblioteca.modelos.find((x) => x.id === m)
      return executar(() => usarModelo(m, d, escopoAcao), 'Modelo colocado no calendário (rascunho).',
        mod ? { t: 'modelo', data: d, titulo: mod.titulo, modalidade: mod.modalidade, tipo: mod.tipo } : undefined)
    }
    setAberto({ novoData: d })
  }

  const arrastado = arrastando?.startsWith('s:') ? sessoes.find((s) => s.id === arrastando.slice(2)) : null
  const modeloArrastado = arrastando?.startsWith('m:') ? biblioteca.modelos.find((m) => m.id === arrastando.slice(2)) : null

  return (
    <DndContext id="calendario-treinos" sensors={sensores} collisionDetection={colisao} onDragStart={(e: DragStartEvent) => setArrastando(String(e.active.id))} onDragEnd={aoSoltar} onDragCancel={() => setArrastando(null)}>
      <div className="space-y-3">
        {/* Barra */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => ir({ data: anterior })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
            <button onClick={() => ir({ data: hoje })} className="px-2.5 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Hoje</button>
            <button onClick={() => ir({ data: proximo })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
          </div>
          <p className="text-sm font-semibold text-navy-500">{vista === 'mes' ? rotuloMes(ancora) : `${diaMes(de)} a ${diaMes(ate)}`}</p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs ml-1">
            {(['semana', 'mes'] as const).map((v) => (
              <button key={v} onClick={() => ir({ vista: v })} className={`px-2.5 py-1 ${vista === v ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{v === 'semana' ? 'Semana' : 'Mês'}</button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {vista === 'semana' && naGrade.length > 0 && (
              <button disabled={pending} title="Copiar os treinos desta semana para a próxima (como rascunho)"
                onClick={() => executar(async () => {
                  const r = await duplicarSemana(escopoAcao, de, somarDias(de, 7))
                  return r.error ? r : { error: `${r.copiados} treino(s) copiado(s) para a semana seguinte (rascunho).` }
                })}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl px-3 py-1.5 disabled:opacity-50">
                <CopyPlus size={14} /> Duplicar semana
              </button>
            )}
            <button onClick={() => setPainel((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-sm rounded-xl px-3 py-1.5 border ${painel ? 'bg-navy-500 text-white border-navy-500' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              <Library size={14} /> Biblioteca
            </button>
            {rascunhos > 0 && (
              <button disabled={pending} onClick={() => executar(async () => {
                const r = await publicarPeriodo(escopoAcao, de, ate)
                return r.error ? r : { error: `${r.publicados} treino(s) publicado(s): os atletas já veem.` }
              })}
                className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-3 py-1.5 disabled:opacity-50">
                <Send size={14} /> Publicar {rascunhos} rascunho{rascunhos > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
        {msg && <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">{msg}</p>}
        {modeloSel && (
          <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2 flex items-center gap-2">
            Toque no <Plus size={12} className="inline" /> do dia para colocar “{biblioteca.modelos.find((m) => m.id === modeloSel)?.titulo}”.
            <button onClick={() => setModeloSel(null)} className="ml-auto font-semibold">Cancelar</button>
          </p>
        )}

        <div className={`grid gap-3 ${painel ? 'lg:grid-cols-[1fr_260px]' : ''}`}>
          {/* Grade */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[860px] px-4 sm:px-0">
              <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_96px] gap-1 text-[11px] font-semibold text-gray-400 mb-1">
                {NOMES_DIA.map((n) => <div key={n} className="px-1">{n}</div>)}
                <div className="px-1 text-right">Semana</div>
              </div>
              {semanas.map((sem) => {
                const daSemana = naGrade.filter((s) => s.data >= sem[0] && s.data <= sem[6])
                const tot = somarSessoes(daSemana)
                return (
                  <div key={sem[0]} className="grid grid-cols-[repeat(7,minmax(0,1fr))_96px] gap-1 mb-1">
                    {sem.map((d) => (
                      <CelulaDia key={d} d={d} vista={vista} destaque={d === hoje} foraMes={vista === 'mes' && d.slice(0, 7) !== ancora.slice(0, 7)}
                        onMais={() => maisNoDia(d)} selecionandoModelo={Boolean(modeloSel)}>
                        <ListaDoDia dia={d} itens={itensDoDia(d)} chave={(i) => i.k} arrastando={Boolean(arrastando && !arrastando.startsWith('m:'))}
                          render={(i) => i.s ? (
                            <CardSessao s={i.s} arrastavel={arrastavel(i.s)} onAbrir={() => setAberto({ sessaoId: i.s!.id })}
                              realizado={escopo.tipo === 'aluno' ? execucoesPorSessao[i.s.id] ?? null : null}
                              status={escopo.tipo === 'aluno' ? statusDoTreino(i.s, execucoesPorSessao[i.s.id], hoje) : null} />
                          ) : <CardExtra x={i.x!} onAbrir={() => setExtraAberta(i.x!)} />} />
                      </CelulaDia>
                    ))}
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-2 text-[11px] text-gray-500 space-y-0.5">
                      <p className="font-semibold text-navy-500">{daSemana.length} treino{daSemana.length !== 1 ? 's' : ''}</p>
                      <p>{formatarDuracao(tot.duracao_min * 60)}</p>
                      <p>{tot.distancia_km.toLocaleString('pt-BR')} km</p>
                      <p title="Carga planejada">carga {tot.carga.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Biblioteca */}
          {painel && (
            <aside className="bg-white rounded-xl border border-gray-200 p-3 h-fit lg:sticky lg:top-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-navy-500 flex items-center gap-1.5"><Library size={14} /> Biblioteca</p>
                <button onClick={() => setPainel(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              <label className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 mb-2">
                <Search size={12} className="text-gray-400" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar modelo" className="text-sm w-full focus:outline-none" />
              </label>
              <p className="text-[11px] text-gray-400 mb-2">Arraste para um dia (ou toque e depois no + do dia).</p>
              {biblioteca.modelos.length === 0 && <p className="text-xs text-gray-400">Nenhum modelo ainda. Abra um treino e use “Salvar na biblioteca”.</p>}
              {[...biblioteca.pastas.map((p) => ({ id: p.id as string | null, nome: p.nome })), { id: null as string | null, nome: 'Sem pasta' }].map((p) => {
                const daPasta = modelosFiltrados.filter((m) => m.pasta_id === p.id)
                if (!daPasta.length) return null
                return (
                  <div key={p.id ?? 'sem'} className="mb-3">
                    <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1"><Folder size={11} /> {p.nome}</p>
                    <div className="space-y-1">
                      {daPasta.map((m) => (
                        <CardModelo key={m.id} m={m} selecionado={modeloSel === m.id} onSelecionar={() => setModeloSel(modeloSel === m.id ? null : m.id)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </aside>
          )}
        </div>

        {aberto?.sessaoId && !sessaoAberta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <p className="bg-white rounded-xl px-4 py-3 text-sm text-gray-500 shadow">Abrindo…</p>
          </div>
        )}
        {aberto && (!aberto.sessaoId || sessaoAberta) && (
          <MontadorTreino
            key={aberto.sessaoId ?? aberto.novoData}
            sessao={sessaoAberta}
            novo={aberto.novoData ? { data: aberto.novoData, ...escopoAcao } : null}
            atletas={atletas}
            ajustes={sessaoAberta ? ajustesPorSessao[sessaoAberta.id] ?? {} : {}}
            entregas={sessaoAberta ? entregasPorSessao[sessaoAberta.id] ?? {} : {}}
            execucao={sessaoAberta ? execucoesPorSessao[sessaoAberta.id] ?? null : null}
            candidatas={extras}
            limites={limites}
            onFechar={() => setAberto(null)}
            onAbrirSessao={(id) => setAberto({ sessaoId: id })}
          />
        )}
      </div>
      {extraAberta && (
        <ExtraModal extra={extraAberta} onFechar={() => setExtraAberta(null)}
          opcoes={naGrade.filter((s) => s.status === 'publicado' && !execucoesPorSessao[s.id] && Math.abs(new Date(`${s.data}T12:00:00Z`).getTime() - new Date(`${diaLocal(extraAberta.executado_em)}T12:00:00Z`).getTime()) <= 3 * 86_400_000)
            .map((s) => ({ id: s.id, rotulo: `${s.data.slice(8)}/${s.data.slice(5, 7)} · ${s.titulo}`, similaridade: similaridade(
              { modalidade: s.modalidade, data: s.data, duracao_s: s.duracao_min ? s.duracao_min * 60 : null, distancia_m: s.distancia_km ? Number(s.distancia_km) * 1000 : null },
              { modalidade: extraAberta.modalidade ?? '', data: diaLocal(extraAberta.executado_em), duracao_s: extraAberta.duracao_s, distancia_m: extraAberta.distancia_m ? Number(extraAberta.distancia_m) : null }) }))
            .sort((a, b) => (b.similaridade ?? -1) - (a.similaridade ?? -1))} />
      )}
      <DragOverlay dropAnimation={null}>
        {arrastado && <div className={`w-44 rounded-lg border px-2 py-1.5 shadow-lg ${COR_TIPO[arrastado.tipo] ?? 'bg-white'}`}><ConteudoCard s={arrastado} /></div>}
        {modeloArrastado && <div className="w-44 rounded-lg border bg-white px-2 py-1.5 shadow-lg text-xs font-semibold text-navy-500">{modeloArrastado.titulo}</div>}
        {arrastando?.startsWith('x:') && (() => { const x = extras.find((e) => e.id === arrastando.slice(2)) ?? Object.values(execucoesPorSessao).find((e) => e.id === arrastando.slice(2)); return x ? <div className="w-44 rounded-lg border border-dashed border-sky-400 bg-white px-2 py-1.5 shadow-lg text-xs font-semibold text-gray-600">{x.titulo ?? 'Atividade'} <span className="block text-[10px] font-normal text-sky-600">solte sobre o treino</span></div> : null })()}
      </DragOverlay>
    </DndContext>
  )
}
