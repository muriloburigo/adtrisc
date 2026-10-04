'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Star, Send, UserCog, BookmarkPlus } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton'
import EditorBloco from './EditorBloco'
import { blocoNovo, blocosParaPassos, passosParaBlocos, novaChave, type Bloco } from '@/lib/treinos/blocos'
import { calcularCarga, formatarDuracao, formatarPace, metricasPlanejadas, referenciaPadrao, type Referencia } from '@/lib/treinos/calculos'
import { linhasIntervals } from '@/lib/treinos/textoIntervals'
import { MODALIDADES, TIPOS_SESSAO, type Modalidade, type Passo, type TipoSessao } from '@/lib/treinos/tipos'
import { salvarSessao, apagarSessao, criarAjuste } from '@/app/(dashboard)/treinos/actions'
import { salvarModelo, apagarModelo, salvarSessaoComoModelo } from '@/app/(dashboard)/treinos/biblioteca-actions'

export type SessaoView = {
  id: string
  turma_id: string | null
  aluno_id: string | null
  sessao_origem_id: string | null
  data: string
  ordem: number
  titulo: string
  tipo: TipoSessao
  modalidade: Modalidade
  local: string | null
  chave: boolean
  notas: string | null
  status: 'rascunho' | 'publicado'
  duracao_min: number | null
  distancia_km: number | null
  carga: number | null
  passos: Passo[]
}

export type ModeloView = {
  id: string
  pasta_id: string | null
  titulo: string
  tipo: TipoSessao
  modalidade: Modalidade
  local: string | null
  notas: string | null
  passos: Passo[]
}

export type AtletaRef = { id: string; nome: string; referencias: Record<string, Referencia>; fcMax: number | null }

const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
const rotulo = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1'

export default function MontadorTreino({
  sessao, novo, atletas, ajustes, limites, onFechar, onAbrirSessao, modo = 'sessao', modelo = null, pastas = [],
}: {
  modo?: 'sessao' | 'modelo'           // 'modelo' = editar um modelo da biblioteca
  modelo?: ModeloView | null
  pastas?: { id: string; nome: string }[]
  sessao: SessaoView | null
  novo: { data: string; turma_id?: string | null; aluno_id?: string | null } | null
  atletas: AtletaRef[]                 // turma: todos; atleta: só ele
  ajustes: Record<string, string>      // aluno_id → id do ajuste (treino da turma)
  limites: number[]
  onFechar: () => void
  onAbrirSessao: (id: string) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [aba, setAba] = useState<'blocos' | 'geral' | 'atletas' | 'comparativo'>('blocos')
  const ehModelo = modo === 'modelo'
  const origem = ehModelo ? modelo : sessao
  const [f, setF] = useState(() => ({
    data: sessao?.data ?? novo?.data ?? '',
    titulo: origem?.titulo ?? '',
    tipo: (origem?.tipo ?? 'base') as TipoSessao,
    modalidade: (origem?.modalidade ?? 'running') as Modalidade,
    local: origem?.local ?? '',
    chave: sessao?.chave ?? false,
    notas: origem?.notas ?? '',
  }))
  const [pastaId, setPastaId] = useState<string>(modelo?.pasta_id ?? '')
  const [duplicado, setDuplicado] = useState<null | 'modelo' | 'biblioteca'>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [blocos, setBlocos] = useState<Bloco[]>(() =>
    origem?.passos.length ? passosParaBlocos(origem.passos) : [blocoNovo('warmup'), blocoNovo('work'), blocoNovo('cooldown')])
  const ehTurma = Boolean(sessao?.turma_id ?? novo?.turma_id)
  const ehAjuste = Boolean(sessao?.sessao_origem_id)
  const [verAtleta, setVerAtleta] = useState<string>(ehTurma ? '' : atletas[0]?.id ?? '')

  const passos = useMemo(() => blocosParaPassos(blocos), [blocos])
  const atletaVisto = atletas.find((a) => a.id === verAtleta)
  const ref: Referencia = atletaVisto?.referencias[f.modalidade] ?? referenciaPadrao(f.modalidade)
  const metricas = metricasPlanejadas(passos, ref, {}, limites)
  const carga = calcularCarga({ duracao_min: metricas.duracao_s ? Math.ceil(metricas.duracao_s / 60) : null, distancia_km: metricas.distancia_km, tipo: f.tipo })
  const texto = linhasIntervals(passos, f.modalidade, atletaVisto ? { referencia: ref, limites, fcMax: atletaVisto.fcMax } : { limites })

  const mudarBloco = (i: number, b: Bloco) => setBlocos((l) => l.map((x, j) => (j === i ? b : x)))
  const mover = (i: number, d: -1 | 1) => setBlocos((l) => {
    const n = [...l]; const j = i + d
    if (j < 0 || j >= n.length) return l
    ;[n[i], n[j]] = [n[j], n[i]]
    return n
  })

  function salvar(publicar: boolean) {
    setErro(null)
    startTransition(async () => {
      const r = await salvarSessao({
        id: sessao?.id,
        turma_id: sessao?.turma_id ?? novo?.turma_id ?? null,
        aluno_id: sessao?.aluno_id ?? novo?.aluno_id ?? null,
        sessao_origem_id: sessao?.sessao_origem_id ?? null,
        ...f,
        passos,
        publicar: publicar || sessao?.status === 'publicado',
      })
      if (r.error) { setErro(r.error); return }
      router.refresh()
      onFechar()
    })
  }

  function salvarComoModelo(forcar = false) {
    setErro(null); setDuplicado(null)
    startTransition(async () => {
      const r = await salvarModelo({ id: modelo?.id || undefined, pasta_id: pastaId || null, ...f, passos, forcar })
      if (r.duplicado) { setDuplicado('modelo'); return }
      if (r.error) { setErro(r.error); return }
      router.refresh()
      onFechar()
    })
  }

  function paraBiblioteca(forcar = false) {
    if (!sessao) return
    setErro(null); setDuplicado(null); setAviso(null)
    startTransition(async () => {
      const r = await salvarSessaoComoModelo(sessao.id, forcar)
      if (r.duplicado) { setDuplicado('biblioteca'); return }
      if (r.error) { setErro(r.error); return }
      setAviso('Salvo na biblioteca.')
      router.refresh()
    })
  }

  function ajustar(alunoId: string) {
    if (!sessao) return
    startTransition(async () => {
      const r = await criarAjuste(sessao.id, alunoId)
      if (r.error) { setErro(r.error); return }
      router.refresh()
      if (r.id) onAbrirSessao(r.id)
    })
  }

  const abaBtn = (k: typeof aba, t: string, show = true) => show && (
    <button key={k} type="button" onClick={() => setAba(k)}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${aba === k ? 'border-sky-400 text-navy-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{t}</button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/40 sm:p-4" onClick={onFechar}>
      <div className="bg-gray-50 sm:rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[100svh] sm:max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="bg-white sm:rounded-t-2xl px-5 pt-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-gray-400">
                {ehModelo ? (modelo?.id ? 'Modelo da biblioteca' : 'Novo modelo da biblioteca') : sessao ? (ehAjuste ? 'Ajuste individual' : ehTurma ? 'Treino da turma' : 'Treino individual') : 'Novo treino'}
                {sessao?.status === 'rascunho' && ' · rascunho (o atleta ainda não vê)'}
                {sessao?.status === 'publicado' && ' · publicado'}
              </p>
              <input className="w-full text-lg font-semibold text-navy-500 bg-transparent focus:outline-none placeholder:text-gray-300"
                placeholder="Título do treino (ex.: Intervalado 6×400)" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
            </div>
            <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pb-3">
            {ehModelo ? (
              <div><label className={rotulo}>Pasta</label>
                <select className={input} value={pastaId} onChange={(e) => setPastaId(e.target.value)}>
                  <option value="">Sem pasta</option>
                  {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select></div>
            ) : (
              <div><label className={rotulo}>Data</label><input type="date" className={input} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
            )}
            <div><label className={rotulo}>Modalidade</label>
              <select className={input} value={f.modalidade} onChange={(e) => setF({ ...f, modalidade: e.target.value as Modalidade })}>
                {Object.entries(MODALIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label className={rotulo}>Tipo</label>
              <select className={input} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value as TipoSessao })}>
                {Object.entries(TIPOS_SESSAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label className={rotulo}>Local</label><input className={input} placeholder="Ex.: Beira-mar" value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></div>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {abaBtn('blocos', 'Blocos')}
            {abaBtn('geral', 'Visão geral')}
            {abaBtn('atletas', `Atletas (${atletas.length})`, !ehModelo && ehTurma && Boolean(sessao))}
            {abaBtn('comparativo', 'Comparativo', !ehModelo && Boolean(sessao) && !ehTurma)}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {aba === 'blocos' && (
            <>
              {blocos.map((b, i) => (
                <EditorBloco key={b.chave} bloco={b} modalidade={f.modalidade} primeiro={i === 0} ultimo={i === blocos.length - 1}
                  onChange={(nb) => mudarBloco(i, nb)} onMover={(d) => mover(i, d)}
                  onDuplicar={() => setBlocos((l) => [...l.slice(0, i + 1), { ...structuredClone(b), chave: novaChave() }, ...l.slice(i + 1)])}
                  onRemover={() => setBlocos((l) => l.filter((_, j) => j !== i))} />
              ))}
              <div className="flex flex-wrap gap-2">
                {([['warmup', 'continuo', 'Aquecimento'], ['work', 'continuo', 'Contínuo'], ['work', 'intervalado', 'Intervalado'],
                  ['drill', 'continuo', 'Técnica'], ['strength', 'continuo', 'Força'], ['cooldown', 'continuo', 'Volta à calma'], ['note', 'nota', 'Orientação']] as const)
                  .map(([s, m, t]) => (
                    <button key={t} type="button" onClick={() => setBlocos((l) => [...l, blocoNovo(s, m)])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-sky-500 border border-sky-200 hover:bg-sky-50 rounded-lg px-2.5 py-1.5">
                      <Plus size={12} /> {t}
                    </button>
                  ))}
              </div>
              <div>
                <label className={rotulo}>Orientações gerais</label>
                <textarea className={`${input} resize-none`} rows={2} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })}
                  placeholder="Ex.: levar garrafinha; se chover, fazer na esteira" />
              </div>
              {!ehModelo && <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={f.chave} onChange={(e) => setF({ ...f, chave: e.target.checked })} />
                <Star size={14} className="text-amber-500" /> Sessão-chave da semana
              </label>}
            </>
          )}

          {aba === 'geral' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-gray-500">Paces calculados para:</span>
                <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={verAtleta} onChange={(e) => setVerAtleta(e.target.value)}>
                  {ehTurma && <option value="">referência padrão (turma)</option>}
                  {atletas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <span className="text-xs text-gray-400">
                  {ref.origem === 'teste' ? 'pelo último teste' : ref.origem === 'limiar' ? 'pelo limiar cadastrado' : 'sem teste — valor padrão'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[['Duração', formatarDuracao(metricas.duracao_s)], ['Distância', metricas.distancia_km ? `${metricas.distancia_km.toLocaleString('pt-BR')} km` : '—'],
                  ['Pace médio', f.modalidade === 'running' ? formatarPace(metricas.pace_medio_s_km) : '—'], ['Carga', carga ? carga.toLocaleString('pt-BR') : '—']]
                  .map(([k, v]) => (
                    <div key={k} className="bg-white rounded-xl border border-gray-200 px-3 py-2">
                      <p className="text-[11px] text-gray-400">{k}</p><p className="text-sm font-semibold text-navy-500">{v}</p>
                    </div>
                  ))}
              </div>
              <div>
                <p className={rotulo}>Como o treino vai para o Intervals.icu / Garmin</p>
                <pre className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">{texto.join('\n') || '—'}</pre>
              </div>
            </div>
          )}

          {aba === 'atletas' && sessao && (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <p className="px-4 py-2 text-xs text-gray-400">Todos recebem o treino da turma. Para mudar algo só para um atleta, crie um ajuste individual.</p>
              {atletas.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm text-navy-500 flex-1 min-w-0 truncate">{a.nome}</span>
                  {ajustes[a.id] ? (
                    <button type="button" onClick={() => onAbrirSessao(ajustes[a.id])} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1">
                      <UserCog size={12} /> Ajustado · abrir
                    </button>
                  ) : (
                    <button type="button" disabled={pending} onClick={() => ajustar(a.id)} className="text-xs font-medium text-sky-500 hover:text-sky-600 disabled:opacity-50">
                      Ajustar para este atleta
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {aba === 'comparativo' && (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-4">
              O comparativo planejado × realizado aparece quando houver uma atividade ligada a este treino (Intervals.icu, arquivo FIT ou lançamento manual).
            </p>
          )}

        </div>

        {(erro || aviso || duplicado) && (
          <div className="bg-white px-4 pt-3 space-y-2 border-t border-gray-200">
            {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
            {aviso && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{aviso}</p>}
            {duplicado && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex flex-wrap items-center gap-2">
                Já existe um modelo com esse nome e modalidade na biblioteca.
                <button type="button" className="font-semibold underline" onClick={() => (duplicado === 'modelo' ? salvarComoModelo(true) : paraBiblioteca(true))}>Salvar mesmo assim</button>
              </p>
            )}
          </div>
        )}
        {/* Rodapé */}
        <div className="bg-white sm:rounded-b-2xl border-t border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap">
          {ehModelo ? (
            <>
              {modelo?.id && (
                <ConfirmDeleteButton variant="full" label="Apagar modelo" confirmLabel="Apagar?" size={14}
                  action={async () => { const r = await apagarModelo(modelo.id); if (!r.error) { router.refresh(); onFechar() } return r }} />
              )}
              <button type="button" disabled={pending} onClick={() => salvarComoModelo(false)}
                className="ml-auto text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2 disabled:opacity-50">
                {pending ? 'Salvando…' : 'Salvar modelo'}
              </button>
            </>
          ) : (
            <>
              {sessao && (
                <ConfirmDeleteButton variant="full" label={ehAjuste ? 'Remover ajuste' : 'Apagar'} confirmLabel="Apagar?" size={14}
                  action={async () => { const r = await apagarSessao(sessao.id); if (!r.error) { router.refresh(); onFechar() } return r }} />
              )}
              {sessao && (
                <button type="button" disabled={pending} onClick={() => paraBiblioteca(false)} title="Salvar este treino como modelo na biblioteca"
                  className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-sky-500 disabled:opacity-50">
                  <BookmarkPlus size={14} /> Salvar na biblioteca
                </button>
              )}
              <div className="ml-auto flex gap-2">
                {sessao?.status !== 'publicado' && (
                  <button type="button" disabled={pending} onClick={() => salvar(false)}
                    className="text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2 disabled:opacity-50">
                    Salvar rascunho
                  </button>
                )}
                <button type="button" disabled={pending} onClick={() => salvar(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2 disabled:opacity-50">
                  {sessao?.status === 'publicado' ? 'Salvar' : <><Send size={14} /> Salvar e publicar</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


