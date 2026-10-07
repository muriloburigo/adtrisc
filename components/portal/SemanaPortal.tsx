'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import ExtraModal from '@/components/treinos/ExtraModal'
import type { ExecucaoView } from '@/components/treinos/ComparativoTreino'
import { CardExtra, CardSessao, ListaDoDia, chaveOrdemExtra, colisao, reposicionar, statusDoTreino, type TreinoCard } from '@/components/treinos/CardsCalendario'
import { similaridade } from '@/lib/intervals/atividade'
import { NOMES_DIA } from '@/lib/treinos/datas'
import { moverAtividade, ordenarDiaDoAtleta, vincularAtividade } from '@/app/(dashboard)/treinos/execucoes-actions'

export type TreinoPortal = TreinoCard & { ordem: number; ordemAtleta: number | null }

const diaLocal = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

function Dia({ d, i, hoje, children }: { d: string; i: number; hoje: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `d:${d}` })
  return (
    <div ref={setNodeRef} className={`flex gap-3 lg:block rounded-xl lg:border lg:p-1.5 lg:min-h-[220px] ${isOver ? 'bg-sky-50 lg:border-sky-400' : d === hoje ? 'lg:border-sky-400 lg:bg-sky-50/40' : 'lg:border-gray-200 lg:bg-white'}`}>
      <div className={`w-12 shrink-0 text-center pt-2 lg:pt-0 lg:w-auto lg:text-left lg:flex lg:items-baseline lg:gap-1 lg:mb-1 lg:px-0.5 ${d === hoje ? 'text-sky-600 font-bold' : 'text-gray-400'}`}>
        <p className="text-[11px]">{NOMES_DIA[i]}</p><p className="text-sm lg:text-[11px]">{d.slice(8)}</p>
      </div>
      <div className="flex-1 min-w-0 py-1 lg:py-0">{children}</div>
    </div>
  )
}

/**
 * Semana do atleta no portal: os mesmos cards do calendário da equipe (cores de
 * status), em lista no celular e em grade no computador. Arrastar: trocar a ordem
 * dos cards no dia, soltar uma atividade sobre um treino (vincula) ou em outro dia.
 * Criar/editar treinos e mudar treino de dia continuam só com a equipe.
 */
export default function SemanaPortal({ alunoId, dias, hoje, treinos, execucoes, extras: extrasProp, todos }: {
  alunoId: string
  dias: string[]
  hoje: string
  treinos: TreinoPortal[]
  execucoes: Record<string, ExecucaoView>
  extras: ExecucaoView[]
  todos: { id: string; data: string; titulo: string; modalidade: string; duracao_min: number | null; distancia_km: number | null }[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [extraAberta, setExtraAberta] = useState<ExecucaoView | null>(null)
  type Estado = { treinos: TreinoPortal[]; extras: ExecucaoView[]; exec: Record<string, ExecucaoView> }
  type Acao = { t: 'ordem'; itens: string[] } | { t: 'vincular'; exec: string; sessao: string } | { t: 'mover'; exec: string; data: string }
  const [ot, aplicar] = useOptimistic<Estado, Acao>({ treinos, extras: extrasProp, exec: execucoes }, (st, a) => {
    if (a.t === 'ordem') {
      const pos = (k: string) => a.itens.indexOf(k) + 1
      return {
        ...st,
        treinos: st.treinos.map((x) => (a.itens.includes(`s:${x.id}`) ? { ...x, ordemAtleta: pos(`s:${x.id}`) } : x)),
        extras: st.extras.map((x) => (a.itens.includes(`x:${x.id}`) ? { ...x, ordem: pos(`x:${x.id}`) } : x)),
      }
    }
    const vinc = Object.entries(st.exec).find(([, e]) => e.id === a.exec)
    const ex = vinc?.[1] ?? st.extras.find((e) => e.id === a.exec)
    if (!ex) return st
    const exec = Object.fromEntries(Object.entries(st.exec).filter(([, e]) => e.id !== a.exec))
    const extras = st.extras.filter((e) => e.id !== a.exec)
    if (a.t === 'vincular') return { ...st, extras, exec: { ...exec, [a.sessao]: { ...ex, sessao_id: a.sessao } } }
    return { ...st, exec, extras: [...extras, { ...ex, sessao_id: null, executado_em: `${a.data}T12:00:00-03:00` }] }
  })
  const sensores = useSensors(
    // Mouse + toque separados: no celular, arrastar o dedo rola a página; segurar é que pega o card.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )

  type Item = { k: string; s?: TreinoPortal; x?: ExecucaoView; o: number }
  const itensDoDia = (d: string): Item[] => [
    ...ot.treinos.filter((t) => t.data === d).map((s) => ({ k: `s:${s.id}`, s, o: Number(s.ordemAtleta ?? s.ordem) })),
    ...ot.extras.filter((x) => diaLocal(x.executado_em) === d).map((x) => ({ k: `x:${x.id}`, x, o: chaveOrdemExtra(x) })),
  ].sort((a, b) => a.o - b.o)

  const executar = (fn: () => Promise<{ error?: string }>, ok: string | null, otimistas: Acao[]) => startTransition(async () => {
    for (const o of otimistas) aplicar(o)
    const r = await fn()
    setMsg(r.error ?? ok)
    router.refresh()
  })

  function aoSoltar(e: DragEndEvent) {
    setArrastando(null)
    const a = String(e.active.id), o = e.over ? String(e.over.id) : null
    if (!o) return
    const diaDestino = o.startsWith('d:') ? o.slice(2) : (e.over?.data.current?.data as string | undefined)
    if (!diaDestino) return
    const exec = a.startsWith('x:') ? a.slice(2) : null
    const vinculada = exec ? Object.entries(ot.exec).find(([, x]) => x.id === exec) : undefined
    const k = vinculada ? `s:${vinculada[0]}` : a
    const s = k.startsWith('s:') ? ot.treinos.find((x) => x.id === k.slice(2)) : null
    const extra = exec && !vinculada ? ot.extras.find((x) => x.id === exec) : null
    if (!s && !extra) return
    const diaOrigem = s ? s.data : diaLocal(extra!.executado_em)

    if (exec && o.startsWith('sd:')) {
      const alvo = ot.treinos.find((x) => x.id === o.slice(3))
      if (!alvo || vinculada?.[0] === alvo.id) return
      if (ot.exec[alvo.id]) return setMsg('Esse treino já tem uma atividade. Desvincule a atual no treino antes.')
      return executar(() => vincularAtividade(exec, alvo.id), `Atividade ligada a “${alvo.titulo}”.`, [{ t: 'vincular', exec, sessao: alvo.id }])
    }
    const ids = itensDoDia(diaDestino).map((i) => i.k)
    const pos = o.startsWith('o:') ? Number(e.over?.data.current?.pos ?? ids.length) : o.startsWith('sd:') ? Math.max(0, ids.indexOf(`s:${o.slice(3)}`)) : ids.length
    if (diaOrigem === diaDestino) {
      const nova = reposicionar(ids, k, pos)
      if (!nova) return
      return executar(() => ordenarDiaDoAtleta(alunoId, nova), null, [{ t: 'ordem', itens: nova }])
    }
    if (!exec) return setMsg('Mudar o treino de dia é com o treinador. Aqui dá para trocar a ordem dentro do dia.')
    const nova = [...ids]
    nova.splice(pos, 0, `x:${exec}`)
    executar(async () => {
      const r = await moverAtividade(exec, diaDestino)
      return r.error ? r : ordenarDiaDoAtleta(alunoId, nova)
    }, vinculada ? 'Atividade mudou de dia (saiu do treino e ficou sem treino).' : 'Atividade mudou de dia.', [{ t: 'mover', exec, data: diaDestino }, { t: 'ordem', itens: nova }])
  }

  const arrastado = arrastando ? (() => {
    const id = arrastando.slice(2)
    if (arrastando.startsWith('s:')) return ot.treinos.find((t) => t.id === id)?.titulo
    return (ot.extras.find((x) => x.id === id) ?? Object.values(ot.exec).find((x) => x.id === id))?.titulo ?? 'Atividade'
  })() : null

  return (
    <DndContext id="semana-portal" sensors={sensores} collisionDetection={colisao} onDragStart={(e) => setArrastando(String(e.active.id))} onDragEnd={aoSoltar} onDragCancel={() => setArrastando(null)}>
      {msg && <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2 mb-2">{msg}</p>}
      <div className="space-y-1 lg:space-y-0 lg:grid lg:grid-cols-7 lg:gap-1">
        {dias.map((d, i) => {
          const itens = itensDoDia(d)
          return (
            <Dia key={d} d={d} i={i} hoje={hoje}>
              {itens.length ? (
                <ListaDoDia dia={d} itens={itens} chave={(it) => it.k} arrastando={Boolean(arrastando)}
                  render={(it) => it.s ? (
                    <CardSessao s={it.s} arrastavel realizado={ot.exec[it.s.id] ?? null} status={statusDoTreino(it.s, ot.exec[it.s.id], hoje)}
                      rotuloAjuste="ajustado para você" onAbrir={() => router.push(`/portal/treino/${it.s!.id}`)} />
                  ) : <CardExtra x={it.x!} onAbrir={() => setExtraAberta(it.x!)} />} />
              ) : <p className="text-xs text-gray-300 pt-1.5 lg:pt-0 lg:px-0.5">Descanso</p>}
            </Dia>
          )
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        <span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1" />feito
        <span className="inline-block w-2 h-2 rounded-sm bg-amber-300 ml-3 mr-1" />fora do planejado (±20%)
        <span className="inline-block w-2 h-2 rounded-sm bg-red-500 ml-3 mr-1" />não feito
        <span className="inline-block w-2 h-2 rounded-sm bg-gray-300 ml-3 mr-1" />sem treino planejado
        <span className="block mt-0.5">Arraste um card para trocar a ordem no dia, ou uma atividade sobre o treino para ligar os dois (no celular, toque e segure).</span>
      </p>
      {extraAberta && (
        <ExtraModal extra={extraAberta} onFechar={() => setExtraAberta(null)}
          opcoes={todos.filter((t) => !ot.exec[t.id] && Math.abs(new Date(`${t.data}T12:00:00Z`).getTime() - new Date(`${diaLocal(extraAberta.executado_em)}T12:00:00Z`).getTime()) <= 3 * 86_400_000)
            .map((t) => ({ id: t.id, rotulo: `${t.data.slice(8)}/${t.data.slice(5, 7)} · ${t.titulo}`, similaridade: similaridade(
              { modalidade: t.modalidade, data: t.data, duracao_s: t.duracao_min ? t.duracao_min * 60 : null, distancia_m: t.distancia_km ? Number(t.distancia_km) * 1000 : null },
              { modalidade: extraAberta.modalidade ?? '', data: diaLocal(extraAberta.executado_em), duracao_s: extraAberta.duracao_s, distancia_m: extraAberta.distancia_m ? Number(extraAberta.distancia_m) : null }) }))
            .sort((a, b) => (b.similaridade ?? -1) - (a.similaridade ?? -1))} />
      )}
      <DragOverlay dropAnimation={null}>
        {arrastado && <div className="w-40 rounded-lg border border-sky-400 bg-white px-2 py-1.5 shadow-lg text-xs font-semibold text-navy-500 truncate">{arrastado}</div>}
      </DragOverlay>
    </DndContext>
  )
}
