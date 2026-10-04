'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Send, Star, UserCog, User } from 'lucide-react'
import MontadorTreino, { type AtletaRef, type SessaoView } from './MontadorTreino'
import { somarSessoes, formatarDuracao } from '@/lib/treinos/calculos'
import { MODALIDADES, TIPOS_SESSAO } from '@/lib/treinos/tipos'
import { NOMES_DIA, diaMes, hojeISO, mesAnterior, rotuloMes, somarDias } from '@/lib/treinos/datas'
import { publicarPeriodo } from '@/app/(dashboard)/treinos/actions'

export type SessaoCalendario = SessaoView & { origem: 'turma' | 'ajuste' | 'individual'; nAjustes: number }

const COR_TIPO: Record<string, string> = {
  base: 'bg-sky-50 border-sky-200', long: 'bg-indigo-50 border-indigo-200', interval: 'bg-orange-50 border-orange-200',
  recovery: 'bg-green-50 border-green-200', technique: 'bg-purple-50 border-purple-200', strength: 'bg-gray-100 border-gray-300',
  race_simulation: 'bg-red-50 border-red-200', brick: 'bg-amber-50 border-amber-200',
}
const SIGLA_MOD: Record<string, string> = { running: 'C', cycling: 'B', swimming: 'N', strength: 'F', other: '•' }

function CardSessao({ s, onAbrir }: { s: SessaoCalendario; onAbrir: () => void }) {
  return (
    <button type="button" onClick={onAbrir}
      className={`w-full text-left rounded-lg border px-2 py-1.5 hover:shadow-sm transition-shadow ${COR_TIPO[s.tipo] ?? 'bg-white border-gray-200'} ${s.status === 'rascunho' ? 'border-dashed opacity-80' : ''}`}>
      <div className="flex items-center gap-1">
        <span className="shrink-0 w-4 h-4 rounded bg-navy-500 text-white text-[9px] font-bold flex items-center justify-center" title={MODALIDADES[s.modalidade]}>{SIGLA_MOD[s.modalidade]}</span>
        <span className="text-xs font-semibold text-navy-500 truncate">{s.titulo}</span>
        {s.chave && <Star size={10} className="shrink-0 text-amber-500 fill-amber-400" />}
      </div>
      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
        {TIPOS_SESSAO[s.tipo]}
        {s.duracao_min ? ` · ${s.duracao_min} min` : ''}
        {s.distancia_km ? ` · ${Number(s.distancia_km).toLocaleString('pt-BR')} km` : ''}
      </p>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {s.status === 'rascunho' && <span className="text-[9px] font-semibold text-gray-500 bg-white/80 rounded px-1">rascunho</span>}
        {s.origem === 'ajuste' && <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 rounded px-1 inline-flex items-center gap-0.5"><UserCog size={9} />ajustado</span>}
        {s.origem === 'individual' && <span className="text-[9px] font-semibold text-sky-700 bg-sky-100 rounded px-1 inline-flex items-center gap-0.5"><User size={9} />individual</span>}
        {s.nAjustes > 0 && <span className="text-[9px] text-amber-700">{s.nAjustes} ajuste{s.nAjustes > 1 ? 's' : ''}</span>}
      </div>
    </button>
  )
}

export default function CalendarioTreinos({
  escopo, vista, ancora, semanas, sessoes, atletas, ajustesPorSessao, limites,
}: {
  escopo: { tipo: 'turma' | 'aluno'; id: string; nome: string }
  vista: 'semana' | 'mes'
  ancora: string
  semanas: string[][]
  sessoes: SessaoCalendario[]
  atletas: AtletaRef[]
  ajustesPorSessao: Record<string, Record<string, string>>
  limites: number[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [aberto, setAberto] = useState<{ sessaoId?: string; novoData?: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const hoje = hojeISO()

  const ir = (p: Record<string, string>) => {
    const q = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(p)) q.set(k, v)
    router.push(`${pathname}?${q}`, { scroll: false })
  }
  const anterior = vista === 'semana' ? somarDias(ancora, -7) : mesAnterior(ancora, -1)
  const proximo = vista === 'semana' ? somarDias(ancora, 7) : mesAnterior(ancora, 1)
  const de = semanas[0][0], ate = semanas[semanas.length - 1][6]
  const rascunhos = sessoes.filter((s) => s.status === 'rascunho' && (escopo.tipo === 'aluno' || s.origem !== 'ajuste')).length
  // Na visão da turma, os ajustes individuais vêm junto (para abrir pela aba Atletas), mas não entram na grade.
  const naGrade = escopo.tipo === 'turma' ? sessoes.filter((s) => s.origem !== 'ajuste') : sessoes
  const porDia = (d: string) => naGrade.filter((s) => s.data === d)
  const sessaoAberta = aberto?.sessaoId ? sessoes.find((s) => s.id === aberto.sessaoId) ?? null : null

  function publicar() {
    setMsg(null)
    startTransition(async () => {
      const r = await publicarPeriodo(escopo.tipo === 'turma' ? { turma_id: escopo.id } : { aluno_id: escopo.id }, de, ate)
      setMsg(r.error ?? `${r.publicados} treino(s) publicado(s): os atletas já veem.`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Barra */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => ir({ data: anterior })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={18} /></button>
          <button onClick={() => ir({ data: hoje })} className="px-2.5 py-1 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Hoje</button>
          <button onClick={() => ir({ data: proximo })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={18} /></button>
        </div>
        <p className="text-sm font-semibold text-navy-500">
          {vista === 'mes' ? rotuloMes(ancora) : `${diaMes(de)} a ${diaMes(ate)}`}
        </p>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs ml-1">
          {(['semana', 'mes'] as const).map((v) => (
            <button key={v} onClick={() => ir({ vista: v })} className={`px-2.5 py-1 ${vista === v ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {rascunhos > 0 && (
            <button disabled={pending} onClick={publicar}
              className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-3 py-1.5 disabled:opacity-50">
              <Send size={14} /> Publicar {rascunhos} rascunho{rascunhos > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
      {msg && <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2">{msg}</p>}

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
                {sem.map((d) => {
                  const foraMes = vista === 'mes' && d.slice(0, 7) !== ancora.slice(0, 7)
                  return (
                    <div key={d} className={`rounded-xl border p-1.5 ${vista === 'semana' ? 'min-h-[220px]' : 'min-h-[110px]'} ${d === hoje ? 'border-sky-400 bg-sky-50/40' : 'border-gray-200 bg-white'} ${foraMes ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-semibold ${d === hoje ? 'text-sky-600' : 'text-gray-400'}`}>{diaMes(d)}</span>
                        <button onClick={() => setAberto({ novoData: d })} title="Adicionar treino"
                          className="p-0.5 rounded text-gray-300 hover:text-sky-500 hover:bg-sky-50"><Plus size={14} /></button>
                      </div>
                      <div className="space-y-1">
                        {porDia(d).map((s) => <CardSessao key={s.id} s={s} onAbrir={() => setAberto({ sessaoId: s.id })} />)}
                      </div>
                    </div>
                  )
                })}
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

      {/* Sessão recém-criada (ex.: ajuste) ainda não chegou do servidor: espera o refresh. */}
      {aberto?.sessaoId && !sessaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <p className="bg-white rounded-xl px-4 py-3 text-sm text-gray-500 shadow">Abrindo…</p>
        </div>
      )}
      {aberto && (!aberto.sessaoId || sessaoAberta) && (
        <MontadorTreino
          key={aberto.sessaoId ?? aberto.novoData}
          sessao={sessaoAberta}
          novo={aberto.novoData ? { data: aberto.novoData, ...(escopo.tipo === 'turma' ? { turma_id: escopo.id } : { aluno_id: escopo.id }) } : null}
          atletas={atletas}
          ajustes={sessaoAberta ? ajustesPorSessao[sessaoAberta.id] ?? {} : {}}
          limites={limites}
          onFechar={() => setAberto(null)}
          onAbrirSessao={(id) => setAberto({ sessaoId: id })}
        />
      )}
    </div>
  )
}
