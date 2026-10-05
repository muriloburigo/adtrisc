'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Sparkles, Star } from 'lucide-react'
import { criarPlano } from '@/app/(dashboard)/treinos/planos-actions'
import { DIAS_ISO, MULTI_PADRAO, OBJETIVOS_INFO, gerarPlano, type EntradaGerador, type EntradaMulti } from '@/lib/treinos/gerador'
import { DIFICULDADES, MODALIDADES, OBJETIVOS, TIPOS_SESSAO, type Dificuldade, type Modalidade, type Objetivo } from '@/lib/treinos/tipos'
import { formatarDuracao } from '@/lib/treinos/calculos'
import { hojeISO, inicioSemana, somarDias, diaMes, NOMES_DIA } from '@/lib/treinos/datas'

const input = 'border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white'
const rotulo = 'block text-xs font-medium text-gray-500 mb-1'

/** Formulário de plano com pré-visualização ao vivo do gerador (porte do wizard do Movelly). */
export default function FormPlano({ escopo }: { escopo: { turma_id?: string; aluno_id?: string } }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const seg = somarDias(inicioSemana(hojeISO()), 7)
  const [titulo, setTitulo] = useState('')
  const [notas, setNotas] = useState('')
  const [provaNome, setProvaNome] = useState('')
  const [e, setE] = useState<EntradaGerador>({
    inicio: seg, fim: somarDias(seg, 7 * 8 - 1), modalidade: 'running', objetivo: 'base', dificuldade: 'intermediate',
    sessoes_semana: 3, dias_disponiveis: [], dia_longo: 6, incluir_forca: false, distancia_alvo_km: null, prova_alvo_data: null,
  })
  const set = (p: Partial<EntradaGerador>) => setE((x) => ({ ...x, ...p }))
  const manual = e.objetivo === 'manual'
  const previa = useMemo(() => (manual ? null : gerarPlano(e)), [e, manual])

  const semanas = useMemo(() => {
    const m = new Map<string, NonNullable<typeof previa>['sessoes']>()
    for (const s of previa?.sessoes ?? []) {
      const k = inicioSemana(s.data)
      m.set(k, [...(m.get(k) ?? []), s])
    }
    return [...m.entries()]
  }, [previa])
  const cargaMax = Math.max(1, ...semanas.map(([, ss]) => ss.reduce((t, s) => t + s.carga, 0)))

  function mudarObjetivo(o: Objetivo) {
    const n = OBJETIVOS_INFO[o].sessoes_semana
    set({ objetivo: o, ...(n ? { sessoes_semana: n } : {}), ...(e.multi ? { multi: { ...e.multi, transicao: o === 'race_specific' ? true : e.multi.transicao } } : {}) })
  }
  const setMulti = (p: Partial<EntradaMulti>) => setE((x) => ({ ...x, multi: { ...(x.multi ?? MULTI_PADRAO), ...p } }))
  const setMod = (i: number, p: Partial<EntradaMulti['modalidades'][number]>) =>
    setE((x) => ({ ...x, multi: { ...x.multi!, modalidades: x.multi!.modalidades.map((m, j) => (j === i ? { ...m, ...p } : m)) } }))
  const NOME_MULTI = { swimming: 'Natação', cycling: 'Bike', running: 'Corrida' } as const
  function alternarDia(d: number) {
    const tem = e.dias_disponiveis.includes(d)
    set({ dias_disponiveis: tem ? e.dias_disponiveis.filter((x) => x !== d) : [...e.dias_disponiveis, d].sort() })
  }

  function criar() {
    setErro(null)
    startTransition(async () => {
      const r = await criarPlano({ ...escopo, titulo: titulo || `${OBJETIVOS[e.objetivo]} — ${diaMes(e.inicio)}`, notas, prova_alvo_nome: provaNome, gerar: !manual, entrada: e })
      if (r.error) { setErro(r.error); return }
      router.push(`/treinos/planos/${r.id}`)
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      {/* Parâmetros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 h-fit">
        <div><label className={rotulo}>Nome do plano</label><input className={input} value={titulo} onChange={(ev) => setTitulo(ev.target.value)} placeholder={`${OBJETIVOS[e.objetivo]} — ${diaMes(e.inicio)}`} /></div>
        <div>
          <label className={rotulo}>Objetivo</label>
          <select className={input} value={e.objetivo} onChange={(ev) => mudarObjetivo(ev.target.value as Objetivo)}>
            {Object.entries(OBJETIVOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">{OBJETIVOS_INFO[e.objetivo].descricao}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={rotulo}>Início</label><input type="date" className={input} value={e.inicio} onChange={(ev) => set({ inicio: ev.target.value })} /></div>
          <div><label className={rotulo}>Fim</label><input type="date" className={input} value={e.fim} onChange={(ev) => set({ fim: ev.target.value })} /></div>
        </div>
        {!manual && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={rotulo}>Modalidade</label>
                <select className={input} value={e.multi ? 'multi' : e.modalidade}
                  onChange={(ev) => ev.target.value === 'multi'
                    ? set({ modalidade: 'other', multi: { ...MULTI_PADRAO, transicao: e.objetivo === 'race_specific' } })
                    : set({ modalidade: ev.target.value as Modalidade, multi: null })}>
                  {(['running', 'cycling', 'swimming'] as const).map((m) => <option key={m} value={m}>{MODALIDADES[m]}</option>)}
                  <option value="multi">Multiesporte (triathlon)</option>
                </select></div>
              <div><label className={rotulo}>Nível</label>
                <select className={input} value={e.dificuldade} onChange={(ev) => set({ dificuldade: ev.target.value as Dificuldade })}>
                  {Object.entries(DIFICULDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            {e.multi ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="grid grid-cols-[1fr_52px_64px_64px] gap-1 bg-gray-50 px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase">
                    <span>Modalidade</span><span>Por sem.</span><span>Longo</span><span>Dist. (km)</span>
                  </div>
                  {e.multi.modalidades.map((m, i) => (
                    <div key={m.modalidade} className="grid grid-cols-[1fr_52px_64px_64px] gap-1 items-center px-2 py-1.5 border-t border-gray-100">
                      <label className="flex items-center gap-1.5 text-sm text-gray-700">
                        <input type="checkbox" checked={m.sessoes > 0} onChange={(ev) => setMod(i, { sessoes: ev.target.checked ? 2 : 0 })} /> {NOME_MULTI[m.modalidade]}
                      </label>
                      <input type="number" min={0} max={7} disabled={!m.sessoes} className={`${input} px-1.5 py-1`} value={m.sessoes}
                        onChange={(ev) => setMod(i, { sessoes: Math.max(0, Math.min(7, Number(ev.target.value) || 0)) })} />
                      <select disabled={!m.sessoes} className={`${input} px-1 py-1`} value={m.dia_longo} onChange={(ev) => setMod(i, { dia_longo: Number(ev.target.value) })}>
                        {DIAS_ISO.map((d) => <option key={d.v} value={d.v}>{d.nome}</option>)}
                      </select>
                      <input disabled={!m.sessoes} className={`${input} px-1.5 py-1`} inputMode="decimal" placeholder="—" value={m.distancia_alvo_km ?? ''}
                        onChange={(ev) => { const n = Number(ev.target.value.replace(',', '.')); setMod(i, { distancia_alvo_km: ev.target.value && Number.isFinite(n) && n > 0 ? n : null }) }} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={rotulo}>Máx. treinos por dia</label>
                    <select className={input} value={e.multi.max_por_dia} onChange={(ev) => setMulti({ max_por_dia: Number(ev.target.value) })}>
                      {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select></div>
                  <label className="flex items-end gap-2 text-sm text-gray-600 pb-2" title="1×/semana: bike seguida de corrida no mesmo dia (fora da semana da prova)">
                    <input type="checkbox" checked={e.multi.transicao} onChange={(ev) => setMulti({ transicao: ev.target.checked })} /> Transição (bike + corrida)
                  </label>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              <div><label className={rotulo}>Treinos por semana</label>
                <input type="number" min={1} max={7} className={input} value={e.sessoes_semana} onChange={(ev) => set({ sessoes_semana: Math.max(1, Math.min(7, Number(ev.target.value) || 1)) })} /></div>
              <div><label className={rotulo}>Dia do longo</label>
                <select className={input} value={e.dia_longo} onChange={(ev) => set({ dia_longo: Number(ev.target.value) })}>
                  {DIAS_ISO.map((d) => <option key={d.v} value={d.v}>{d.nome}</option>)}
                </select></div>
            </div>
            )}
            <div>
              <label className={rotulo}>Dias disponíveis <span className="font-normal text-gray-400">(nenhum = padrão)</span></label>
              <div className="flex flex-wrap gap-1">
                {DIAS_ISO.map((d) => (
                  <button key={d.v} type="button" onClick={() => alternarDia(d.v)}
                    className={`px-2.5 py-1 rounded-lg text-xs border ${e.dias_disponiveis.includes(d.v) ? 'bg-navy-500 text-white border-navy-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{d.nome}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {e.multi ? <div /> : (
              <div><label className={rotulo}>Distância alvo (km)</label>
                <input className={input} inputMode="decimal" placeholder="opcional" value={e.distancia_alvo_km ?? ''}
                  onChange={(ev) => { const n = Number(ev.target.value.replace(',', '.')); set({ distancia_alvo_km: ev.target.value && Number.isFinite(n) && n > 0 ? n : null }) }} /></div>
              )}
              <label className="flex items-end gap-2 text-sm text-gray-600 pb-2">
                <input type="checkbox" checked={Boolean(e.incluir_forca)} onChange={(ev) => set({ incluir_forca: ev.target.checked })} /> Incluir força
              </label>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><label className={rotulo}>Prova alvo</label><input className={input} value={provaNome} onChange={(ev) => setProvaNome(ev.target.value)} placeholder="opcional" /></div>
          <div><label className={rotulo}>Data da prova</label><input type="date" className={input} value={e.prova_alvo_data ?? ''} onChange={(ev) => set({ prova_alvo_data: ev.target.value || null })} /></div>
        </div>
        <div><label className={rotulo}>Observações</label><textarea className={`${input} resize-none`} rows={2} value={notas} onChange={(ev) => setNotas(ev.target.value)} /></div>
        {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <button disabled={pending || (!manual && !previa?.sessoes.length)} onClick={criar}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2.5 disabled:opacity-50">
          <Sparkles size={14} /> {pending ? 'Criando…' : manual ? 'Criar plano vazio' : `Criar plano com ${previa?.sessoes.length ?? 0} treinos (rascunho)`}
        </button>
        <p className="text-[11px] text-gray-400">Os treinos entram como rascunho: revise e ajuste no calendário, depois publique o plano.</p>
      </div>

      {/* Pré-visualização */}
      <div className="space-y-3">
        {manual ? (
          <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-6">Plano manual: ele nasce vazio e você monta os treinos no calendário.</p>
        ) : previa && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[['Semanas', previa.resumo.semanas], ['Treinos', previa.resumo.sessoes], ['Tempo total', formatarDuracao(previa.resumo.duracao_min * 60)], ['Distância', `${previa.resumo.distancia_km.toLocaleString('pt-BR')} km`]].map(([k, v]) => (
                <div key={k as string} className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-[11px] text-gray-400">{k}</p><p className="font-semibold text-navy-500">{v}</p></div>
              ))}
            </div>
            {previa.avisos.map((a) => <p key={a} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-1.5"><AlertTriangle size={12} /> {a}</p>)}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {semanas.map(([sem, ss], i) => {
                const carga = ss.reduce((t, s) => t + s.carga, 0)
                const porMod = e.multi ? (['swimming', 'cycling', 'running', 'strength'] as const)
                  .map((m) => ({ m, min: ss.filter((s) => s.modalidade === m).reduce((t, s) => t + s.duracao_min, 0) })).filter((x) => x.min > 0) : []
                return (
                  <div key={sem} className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <p className="text-xs font-semibold text-navy-500 w-28 shrink-0">Semana {i + 1} · {diaMes(sem)}</p>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(carga / cargaMax) * 100}%` }} /></div>
                      <p className="text-[11px] text-gray-400 w-24 text-right">carga {Math.round(carga)}</p>
                    </div>
                    {porMod.length > 0 && (
                      <p className="text-[11px] text-gray-500 mb-1.5">{porMod.map((x) => `${MODALIDADES[x.m]} ${formatarDuracao(x.min * 60)}`).join(' · ')}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {ss.map((s, j) => (
                        <span key={`${s.data}-${j}`} className="text-[11px] bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                          <strong className="text-gray-600">{NOMES_DIA[(new Date(`${s.data}T12:00:00Z`).getUTCDay() + 6) % 7]} {diaMes(s.data)}</strong>{' '}
                          {e.multi && <span className="text-gray-500">{MODALIDADES[s.modalidade]} · </span>}{TIPOS_SESSAO[s.tipo]} · {s.duracao_min}′{s.distancia_km ? ` · ${s.distancia_km.toLocaleString('pt-BR')} km` : ''} · {s.intensidade_alvo}
                          {s.chave && <Star size={9} className="inline ml-0.5 text-amber-500 fill-amber-400" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
