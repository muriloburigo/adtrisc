'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, type CollisionDetection, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { ChevronLeft, ChevronRight, Plus, Send, Star, UserCog, User, Library, CopyPlus, Search, X, Folder, MessageSquare } from 'lucide-react'
import MontadorTreino, { type AtletaRef, type SessaoView } from './MontadorTreino'
import { somarSessoes, formatarDuracao } from '@/lib/treinos/calculos'
import { MODALIDADES, TIPOS_SESSAO, type Modalidade, type TipoSessao } from '@/lib/treinos/tipos'
import { NOMES_DIA, diaMes, hojeISO, mesAnterior, rotuloMes, somarDias } from '@/lib/treinos/datas'
import { publicarPeriodo } from '@/app/(dashboard)/treinos/actions'
import { moverSessao, reordenarDia, usarModelo, duplicarSemana } from '@/app/(dashboard)/treinos/biblioteca-actions'

export type SessaoCalendario = SessaoView & {
  origem: 'turma' | 'ajuste' | 'individual'
  nAjustes: number
  situacao?: 'planejado' | 'feito' | 'nao_feito' | 'parcial'   // só na visão do atleta
  obsAtleta?: string | null
}
export type ModeloResumo = { id: string; titulo: string; modalidade: Modalidade; tipo: TipoSessao; duracao_min: number | null; distancia_km: number | null; pasta_id: string | null }
export type Biblioteca = { pastas: { id: string; nome: string }[]; modelos: ModeloResumo[] }

const COR_TIPO: Record<string, string> = {
  base: 'bg-sky-50 border-sky-200', long: 'bg-indigo-50 border-indigo-200', interval: 'bg-orange-50 border-orange-200',
  recovery: 'bg-green-50 border-green-200', technique: 'bg-purple-50 border-purple-200', strength: 'bg-gray-100 border-gray-300',
  race_simulation: 'bg-red-50 border-red-200', brick: 'bg-amber-50 border-amber-200',
}
// Solta onde está o ponteiro (não onde o card largo da biblioteca encosta);
// sobre um treino, vale o treino (reordenar) em vez do dia.
const colisao: CollisionDetection = (args) => {
  const sob = pointerWithin(args)
  const lista = sob.length ? sob : rectIntersection(args)
  return [...lista].sort((a, b) => Number(String(b.id).startsWith('sd:')) - Number(String(a.id).startsWith('sd:')))
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

function CardSessao({ s, arrastavel, onAbrir }: { s: SessaoCalendario; arrastavel: boolean; onAbrir: () => void }) {
  const { setNodeRef: refArrasto, listeners, attributes, isDragging } = useDraggable({ id: `s:${s.id}`, disabled: !arrastavel })
  const { setNodeRef: refAlvo, isOver } = useDroppable({ id: `sd:${s.id}`, data: { data: s.data } })
  return (
    <div ref={refAlvo} className={isOver ? 'border-t-2 border-sky-400 pt-0.5' : ''}>
      <button ref={refArrasto} type="button" onClick={onAbrir} {...listeners} {...attributes}
        className={`w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition-shadow ${COR_TIPO[s.tipo] ?? 'bg-white border-gray-200'} ${s.status === 'rascunho' ? 'border-dashed opacity-80' : ''} ${isDragging ? 'opacity-30' : ''} ${arrastavel ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <ConteudoCard s={s} />
      </button>
    </div>
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
  escopo, vista, ancora, semanas, sessoes, atletas, ajustesPorSessao, limites, biblioteca,
}: {
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
  const rascunhos = naGrade.filter((s) => s.status === 'rascunho').length
  const sessaoAberta = aberto?.sessaoId ? sessoes.find((s) => s.id === aberto.sessaoId) ?? null : null
  // Treino da turma só se mexe na visão da turma; ajustes acompanham o da turma.
  const arrastavel = (s: SessaoCalendario) => (escopo.tipo === 'turma' ? s.origem === 'turma' : s.origem === 'individual')

  const modelosFiltrados = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return biblioteca.modelos.filter((m) => !b || m.titulo.toLowerCase().includes(b))
  }, [busca, biblioteca.modelos])

  const executar = (fn: () => Promise<{ error?: string }>, ok?: string) => startTransition(async () => {
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
    if (a.startsWith('m:')) return executar(() => usarModelo(a.slice(2), diaDestino, escopoAcao), 'Modelo colocado no calendário (rascunho).')
    if (!a.startsWith('s:')) return
    const id = a.slice(2)
    const s = sessoes.find((x) => x.id === id)
    if (!s) return
    if (o.startsWith('sd:') && s.data === diaDestino) {
      // Reordenar dentro do dia: coloca antes do treino de destino.
      const alvo = o.slice(3)
      if (alvo === id) return
      const ordem = porDia(diaDestino).map((x) => x.id).filter((x) => x !== id)
      ordem.splice(ordem.indexOf(alvo), 0, id)
      return executar(() => reordenarDia(ordem))
    }
    if (s.data !== diaDestino) return executar(() => moverSessao(id, diaDestino))
  }

  function maisNoDia(d: string) {
    if (modeloSel) {
      const m = modeloSel
      setModeloSel(null)
      return executar(() => usarModelo(m, d, escopoAcao), 'Modelo colocado no calendário (rascunho).')
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
                        {porDia(d).map((s) => <CardSessao key={s.id} s={s} arrastavel={arrastavel(s)} onAbrir={() => setAberto({ sessaoId: s.id })} />)}
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
            limites={limites}
            onFechar={() => setAberto(null)}
            onAbrirSessao={(id) => setAberto({ sessaoId: id })}
          />
        )}
      </div>
      <DragOverlay>
        {arrastado && <div className={`w-44 rounded-lg border px-2 py-1.5 shadow-lg ${COR_TIPO[arrastado.tipo] ?? 'bg-white'}`}><ConteudoCard s={arrastado} /></div>}
        {modeloArrastado && <div className="w-44 rounded-lg border bg-white px-2 py-1.5 shadow-lg text-xs font-semibold text-navy-500">{modeloArrastado.titulo}</div>}
      </DragOverlay>
    </DndContext>
  )
}
