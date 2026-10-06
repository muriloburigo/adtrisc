'use client'

import { useMemo, useRef, useState } from 'react'
import { barrasDoTreino } from '@/lib/treinos/grafico'
import type { Referencia } from '@/lib/treinos/calculos'
import type { Modalidade, Passo } from '@/lib/treinos/tipos'

/**
 * Gráfico de intensidade do treino (porte do builder-chart do Movelly):
 * largura = tempo, altura = % da referência (linha tracejada em 100%), até 130%.
 * Passando o mouse, o bloco inteiro fica em destaque e uma dica acompanha o cursor.
 */
export default function GraficoIntensidade({ passos, modalidade, referencia, limites, altura = 110 }: {
  passos: Passo[]; modalidade: Modalidade; referencia: Referencia | null; limites?: number[]; altura?: number
}) {
  const barras = useMemo(() => barrasDoTreino(passos, modalidade, referencia, limites), [passos, modalidade, referencia, limites])
  const [ativo, setAtivo] = useState<number | null>(null)
  const dicaRef = useRef<HTMLDivElement>(null)
  const atual = ativo === null ? null : barras.find((b) => b.bloco === ativo)

  if (!barras.length) return null
  const mover = (e: React.MouseEvent) => {
    const el = dicaRef.current
    if (!el) return
    // Fica do lado esquerdo do cursor quando passaria da borda da tela.
    const x = e.clientX + 18 + 240 > window.innerWidth ? e.clientX - 18 - el.offsetWidth : e.clientX + 18
    el.style.left = `${x}px`
    el.style.top = `${e.clientY - 12}px`
  }

  return (
    <div className="relative rounded-xl bg-[#1a2332] overflow-hidden select-none" style={{ height: altura }}
      onMouseMove={mover} onMouseLeave={() => setAtivo(null)}>
      <span className="absolute left-1.5 top-1.5 text-[9px] text-[#4b6080]">130%</span>
      <span className="absolute left-1.5 text-[9px] text-[#4b6080]" style={{ top: 'calc(10px + (100% - 30px) * 30 / 130 - 6px)' }}>100%</span>
      <span className="absolute left-1.5 bottom-[18px] text-[9px] text-[#4b6080]">0</span>
      {/* linha de 100% (velocidade do teste/limiar) */}
      <div className="absolute left-8 right-2 border-t border-dashed border-[#4b8080]" style={{ top: 'calc(10px + (100% - 30px) * 30 / 130)' }} />
      <span className="absolute right-2.5 text-[9px] text-[#4b8080]" style={{ top: 'calc(10px + (100% - 30px) * 30 / 130 - 12px)' }}>100% do teste</span>
      <span className="absolute left-8 bottom-1 text-[9px] text-[#4b6080]">início</span>
      <span className="absolute right-2.5 bottom-1 text-[9px] text-[#4b6080]">fim</span>
      <div className="absolute left-8 right-2 top-2.5 bottom-5 flex items-end gap-[2px]">
        {barras.map((b) => (
          <div key={b.id} onMouseEnter={() => setAtivo(b.bloco)}
            className={`rounded-t-[3px] transition-opacity duration-150 min-w-[2px] ${ativo !== null && ativo !== b.bloco ? 'opacity-25' : ''}`}
            style={{ flex: b.flex, height: `${(b.pct / 130) * 100}%`, background: b.cor }} />
        ))}
      </div>
      <div ref={dicaRef} className={`fixed z-[99999] pointer-events-none bg-white rounded-[10px] border border-black/5 px-3.5 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,.14),0_1px_4px_rgba(0,0,0,.07)] min-w-[160px] max-w-[260px] ${atual ? '' : 'hidden'}`}>
        {atual && (
          <>
            <p className="font-bold text-[13px] text-[#1a2332] mb-1 flex items-center gap-1.5"><span className="inline-block w-[9px] h-[9px] rounded-[3px]" style={{ background: atual.dica.cor }} />{atual.dica.titulo}</p>
            <p className="text-xs text-gray-700 mb-0.5">{atual.dica.linha2}</p>
            {atual.dica.linha3 && <p className="text-[11px] text-gray-500">{atual.dica.linha3}</p>}
          </>
        )}
      </div>
    </div>
  )
}

/** Miniatura para os cards do calendário (porte do zone-bar-chart do Movelly). */
export function MiniBarras({ passos, modalidade, referencia = null, limites, altura = 18 }: {
  passos: Passo[]; modalidade: Modalidade; referencia?: Referencia | null; limites?: number[]; altura?: number
}) {
  const barras = barrasDoTreino(passos, modalidade, referencia, limites)
  if (barras.length < 1) return null
  return (
    <div className="flex items-end gap-px mt-1 rounded-b overflow-hidden" style={{ height: altura }}>
      {barras.map((b) => (
        <div key={b.id} className="rounded-t-[1px] min-w-[2px] opacity-85" style={{ flex: b.flex, height: Math.max(3, Math.round((b.pct / 120) * altura)), background: b.cor }} />
      ))}
    </div>
  )
}
