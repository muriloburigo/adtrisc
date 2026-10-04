'use client'

import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react'
import { NOMES_ZONA } from '@/lib/zonas'
import { CORES_ZONA, INTENSIDADES, NIVEIS_PSE, TIPOS_PASSO, type Intensidade, type Modalidade, type TipoPasso } from '@/lib/treinos/tipos'
import { lerMmss, mostrarMmss, type Alvo, type Bloco, type Esforco, type Medida } from '@/lib/treinos/blocos'

const input = 'border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white'
const SECOES: TipoPasso[] = ['warmup', 'work', 'recovery', 'cooldown', 'drill', 'strength']

const COR_SECAO: Record<string, string> = {
  warmup: 'border-l-sky-300', work: 'border-l-orange-400', recovery: 'border-l-green-400',
  cooldown: 'border-l-sky-200', drill: 'border-l-purple-400', strength: 'border-l-gray-500', note: 'border-l-amber-300',
}

function AlvoInput({ alvo, modalidade, onChange }: { alvo: Alvo; modalidade: Modalidade; onChange: (a: Alvo) => void }) {
  const opcoes: Intensidade[] = ['open', 'zone', 'pace', 'heart_rate', 'power', 'rpe']
  const mudarTipo = (tipo: Intensidade) => {
    const unidade = tipo === 'zone' ? 'zone' : tipo === 'pace' ? (modalidade === 'cycling' ? 'kmh' : 'pace')
      : tipo === 'heart_rate' ? 'bpm' : tipo === 'power' ? 'w' : tipo === 'rpe' ? 'rpe' : null
    onChange({ tipo, unidade, min: tipo === 'zone' ? 2 : tipo === 'rpe' ? 3 : null, max: tipo === 'zone' ? 2 : tipo === 'rpe' ? 3 : null })
  }
  const faixa = (lerMin: (v: string) => number | null, mostrar: (n: number | null) => string, ph: string, sufixo: string) => (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <input className={`${input} w-20`} placeholder={ph} defaultValue={mostrar(alvo.min)}
        onBlur={(e) => onChange({ ...alvo, min: lerMin(e.target.value) })} />
      –
      <input className={`${input} w-20`} placeholder={ph} defaultValue={mostrar(alvo.max)}
        onBlur={(e) => onChange({ ...alvo, max: lerMin(e.target.value) })} />
      {sufixo}
    </span>
  )
  const numero = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() && Number.isFinite(n) ? n : null }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <select className={input} value={alvo.tipo} onChange={(e) => mudarTipo(e.target.value as Intensidade)}>
        {opcoes.map((o) => (
          <option key={o} value={o}>{o === 'pace' && modalidade === 'cycling' ? 'Velocidade' : INTENSIDADES[o]}</option>
        ))}
      </select>
      {alvo.tipo === 'zone' && (
        <>
          <select className={input} value={alvo.min ?? 2} style={{ color: CORES_ZONA[(alvo.min ?? 2) - 1] }}
            onChange={(e) => { const z = Number(e.target.value); onChange({ ...alvo, min: z, max: Math.max(z, alvo.max ?? z) }) }}>
            {NOMES_ZONA.map((n, i) => <option key={n} value={i + 1}>Z{i + 1} · {n}</option>)}
          </select>
          {/* Faixa de zonas (ex.: Z1–Z2), como no Movelly */}
          <select className={`${input} text-xs`} value={alvo.max ?? alvo.min ?? 2} title="Até a zona"
            onChange={(e) => onChange({ ...alvo, max: Number(e.target.value) })}>
            {NOMES_ZONA.map((_, i) => i + 1 >= (alvo.min ?? 2) && (
              <option key={i} value={i + 1}>{i + 1 === (alvo.min ?? 2) ? 'só ela' : `até Z${i + 1}`}</option>
            ))}
          </select>
        </>
      )}
      {alvo.tipo === 'pace' && alvo.unidade === 'kmh' && faixa(numero, (n) => n?.toString() ?? '', 'km/h', 'km/h')}
      {alvo.tipo === 'pace' && alvo.unidade !== 'kmh' && faixa(lerMmss, mostrarMmss, '4:30', modalidade === 'swimming' ? '/100m' : '/km')}
      {alvo.tipo === 'heart_rate' && faixa(numero, (n) => n?.toString() ?? '', 'bpm', 'bpm')}
      {alvo.tipo === 'power' && faixa(numero, (n) => n?.toString() ?? '', 'W', 'W')}
      {alvo.tipo === 'rpe' && (
        <select className={input} value={alvo.min ?? 3} onChange={(e) => onChange({ ...alvo, min: Number(e.target.value), max: Number(e.target.value) })}>
          {NIVEIS_PSE.map((n) => <option key={n.valor} value={n.valor}>PSE {n.valor} · {n.nome}</option>)}
        </select>
      )}
    </span>
  )
}

function EsforcoInput({ e, modalidade, onChange, rotulo }: { e: Esforco; modalidade: Modalidade; onChange: (e: Esforco) => void; rotulo?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {rotulo && <span className="text-xs font-medium text-gray-500 w-16">{rotulo}</span>}
      <input className={`${input} w-32`} placeholder="Nome (ex.: Tiro)" value={e.titulo} onChange={(ev) => onChange({ ...e, titulo: ev.target.value })} />
      <select className={input} value={e.medida} onChange={(ev) => onChange({ ...e, medida: ev.target.value as Medida, valor: null })}>
        <option value="distancia">Distância</option>
        <option value="tempo">Tempo</option>
        <option value="aberto">Livre (volta)</option>
      </select>
      {e.medida === 'distancia' && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <input className={`${input} w-20`} inputMode="numeric" placeholder="400" value={e.valor ?? ''}
            onChange={(ev) => onChange({ ...e, valor: ev.target.value ? Math.max(0, Math.round(Number(ev.target.value))) : null })} />m
        </span>
      )}
      {e.medida === 'tempo' && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <input className={`${input} w-20`} placeholder="mm:ss" defaultValue={mostrarMmss(e.valor)}
            onBlur={(ev) => onChange({ ...e, valor: lerMmss(ev.target.value) })} />min
        </span>
      )}
      <AlvoInput alvo={e.alvo} modalidade={modalidade} onChange={(alvo) => onChange({ ...e, alvo })} />
    </div>
  )
}

export default function EditorBloco({
  bloco, modalidade, primeiro, ultimo, onChange, onMover, onDuplicar, onRemover,
}: {
  bloco: Bloco
  modalidade: Modalidade
  primeiro: boolean
  ultimo: boolean
  onChange: (b: Bloco) => void
  onMover: (dir: -1 | 1) => void
  onDuplicar: () => void
  onRemover: () => void
}) {
  const btn = 'p-1 rounded text-gray-400 hover:text-navy-500 hover:bg-gray-100 disabled:opacity-30'
  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 ${COR_SECAO[bloco.modo === 'nota' ? 'note' : bloco.secao]} bg-white p-3 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        {bloco.modo !== 'nota' && (
          <select className={`${input} font-medium`} value={bloco.secao} onChange={(e) => onChange({ ...bloco, secao: e.target.value as TipoPasso })}>
            {SECOES.map((s) => <option key={s} value={s}>{TIPOS_PASSO[s]}</option>)}
          </select>
        )}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {(['continuo', 'intervalado', 'nota'] as const).map((m) => (
            <button key={m} type="button" onClick={() => onChange({
              ...bloco, modo: m,
              repeticoes: m === 'intervalado' ? Math.max(2, bloco.repeticoes) : 1,
              descanso: m === 'intervalado' ? (bloco.descanso ?? { titulo: 'Recuperação', medida: 'tempo', valor: 90, alvo: { tipo: 'zone', min: 1, max: 1, unidade: 'zone' } }) : null,
            })} className={`px-2.5 py-1 ${bloco.modo === m ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {m === 'continuo' ? 'Contínuo' : m === 'intervalado' ? 'Intervalado' : 'Orientação'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center">
          <button type="button" className={btn} disabled={primeiro} onClick={() => onMover(-1)} title="Subir"><ArrowUp size={14} /></button>
          <button type="button" className={btn} disabled={ultimo} onClick={() => onMover(1)} title="Descer"><ArrowDown size={14} /></button>
          <button type="button" className={btn} onClick={onDuplicar} title="Duplicar"><Copy size={14} /></button>
          <button type="button" className={`${btn} hover:text-red-500`} onClick={onRemover} title="Remover"><Trash2 size={14} /></button>
        </div>
      </div>

      {bloco.modo === 'nota' ? (
        <textarea className={`${input} w-full resize-none`} rows={2} placeholder="Orientação para o atleta (ex.: hidratar entre os tiros)"
          value={bloco.notas} onChange={(e) => onChange({ ...bloco, notas: e.target.value })} />
      ) : (
        <>
          {bloco.modo === 'intervalado' && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <input className={`${input} w-16`} type="number" min={2} max={99} value={bloco.repeticoes}
                onChange={(e) => onChange({ ...bloco, repeticoes: Math.max(2, Math.min(99, Number(e.target.value) || 2)) })} />
              repetições de
            </div>
          )}
          <EsforcoInput e={bloco.esforco} modalidade={modalidade} rotulo={bloco.modo === 'intervalado' ? 'Esforço' : undefined}
            onChange={(esforco) => onChange({ ...bloco, esforco })} />
          {bloco.modo === 'intervalado' && bloco.descanso && (
            <EsforcoInput e={bloco.descanso} modalidade={modalidade} rotulo="Descanso" onChange={(descanso) => onChange({ ...bloco, descanso })} />
          )}
          <input className={`${input} w-full text-xs`} placeholder="Observação deste bloco (opcional)" value={bloco.notas}
            onChange={(e) => onChange({ ...bloco, notas: e.target.value })} />
        </>
      )}
    </div>
  )
}
