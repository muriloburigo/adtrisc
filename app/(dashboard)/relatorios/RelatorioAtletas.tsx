'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Plus, X, Columns3, RotateCcw } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatDate, secondsToMmss } from '@/lib/utils'
import {
  GRUPOS, COLUNAS_PADRAO, aplicarFiltros, filtroAtivo,
  type Campo, type Filtro, type Linha, type Valor,
} from '@/lib/relatorio'

// Qual avaliação conta para os critérios de avaliação.
type Base = { tipo: 'recente' } | { tipo: 'periodo'; de: string; ate: string }
type Estado = { base: Base; filtros: Filtro[]; colunas: string[]; ordem: { campo: string; dir: 'asc' | 'desc' } }

const ESTADO_INICIAL: Estado = {
  base: { tipo: 'recente' },
  filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }],
  colunas: COLUNAS_PADRAO.atleta,
  ordem: { campo: 'nome', dir: 'asc' },
}

// Atalhos para as perguntas mais comuns — viram filtros editáveis normais.
const PRONTOS: { nome: string; estado: Partial<Estado> }[] = [
  { nome: 'Com alergia', estado: {
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'alergia', modo: 'sim' }],
    colunas: ['nome', 'turma', 'alergia_descricao', 'mae_telefone', 'pai_telefone'] } },
  { nome: 'Condição médica', estado: {
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'condicao_medica', modo: 'sim' }],
    colunas: ['nome', 'turma', 'condicao_medica_descricao', 'tratamento_medico_descricao', 'mae_telefone'] } },
  { nome: 'Sem avaliação', estado: {
    base: { tipo: 'recente' },
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'ultima_avaliacao', modo: 'vazio' }],
    colunas: ['nome', 'turma', 'idade', 'cadastrado_em'] } },
  { nome: 'Em zona de risco (PROESP)', estado: {
    base: { tipo: 'recente' },
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'testes_em_risco', modo: 'faixa', min: '1' }],
    colunas: ['nome', 'turma', 'idade', 'ultima_avaliacao', 'testes_em_risco'], ordem: { campo: 'testes_em_risco', dir: 'desc' } } },
  { nome: 'Aptos para a equipe', estado: {
    base: { tipo: 'recente' },
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'apto_equipe', modo: 'sim' }],
    colunas: ['nome', 'turma', 'idade', 'natacao_100m', 'resistencia_5min_dabonneville'], ordem: { campo: 'natacao_100m', dir: 'asc' } } },
  { nome: 'Sem data de nascimento', estado: {
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }, { campo: 'data_nascimento', modo: 'vazio' }],
    colunas: ['nome', 'turma', 'ficha_situacao', 'mae_telefone'] } },
  { nome: 'Camisetas', estado: {
    filtros: [{ campo: 'status', modo: 'valores', valores: ['ativo'] }],
    colunas: ['nome', 'turma', 'tamanho_camiseta'], ordem: { campo: 'turma', dir: 'asc' } } },
]

const ORDEM_NIVEL = ['Fraco', 'Razoável', 'Bom', 'Muito bom', 'Excelência']

function lerEstadoDaUrl(): Estado | null {
  try {
    const r = new URLSearchParams(window.location.search).get('r')
    return r ? { ...ESTADO_INICIAL, ...JSON.parse(r) } : null
  } catch { return null }
}

function formatar(v: Valor, c: Campo): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  if (c.tipo === 'data') return formatDate(String(v))
  if (typeof v === 'number') {
    if (c.formato === 'mmss') return secondsToMmss(v)
    const casas = c.formato === 'dec2' ? 2 : c.formato === 'dec1' ? 1 : 0
    const txt = v.toLocaleString('pt-BR', { maximumFractionDigits: casas })
    return c.sinal && v > 0 ? `+${txt}` : txt
  }
  return String(v)
}

function corDoValor(v: Valor): string {
  if (v === 'Zona de risco' || v === 'Fraco' || v === 'Piorou') return 'text-red-500 font-medium'
  if (v === 'Excelência' || v === 'Muito bom' || v === 'Melhorou') return 'text-green-600 font-medium'
  return 'text-gray-700'
}

function comparar(a: Valor, b: Valor): number {
  if (a == null && b == null) return 0
  if (a == null) return 1 // vazio sempre no fim
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const ia = ORDEM_NIVEL.indexOf(String(a)), ib = ORDEM_NIVEL.indexOf(String(b))
  if (ia >= 0 && ib >= 0) return ia - ib
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true })
}

function filtroNovo(c: Campo): Filtro {
  if (c.tipo === 'lista') return { campo: c.key, modo: 'valores', valores: [] }
  if (c.tipo === 'numero' || c.tipo === 'data') return { campo: c.key, modo: 'faixa', min: '', max: '' }
  if (c.tipo === 'simnao') return { campo: c.key, modo: 'sim' }
  return { campo: c.key, modo: 'contem', texto: '' }
}

const inputCls = 'border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400 bg-white'

function EditorFiltro({
  filtro, campo, opcoes, onChange, onRemove,
}: {
  filtro: Filtro; campo: Campo; opcoes: string[]; onChange: (f: Filtro) => void; onRemove: () => void
}) {
  const modosPorTipo: Record<Campo['tipo'], [Filtro['modo'], string][]> = {
    lista: [['valores', 'é'], ['vazio', 'está vazio'], ['preenchido', 'está preenchido']],
    numero: [['faixa', 'entre'], ['vazio', 'está vazio'], ['preenchido', 'está preenchido']],
    data: [['faixa', 'entre'], ['vazio', 'está vazio'], ['preenchido', 'está preenchido']],
    simnao: [['sim', 'sim'], ['nao', 'não'], ['vazio', 'não informado']],
    texto: [['contem', 'contém'], ['vazio', 'está vazio'], ['preenchido', 'está preenchido']],
  }
  function mudarModo(modo: Filtro['modo']) {
    if (modo === 'valores') onChange({ campo: campo.key, modo, valores: [] })
    else if (modo === 'faixa') onChange({ campo: campo.key, modo, min: '', max: '' })
    else if (modo === 'contem') onChange({ campo: campo.key, modo, texto: '' })
    else onChange({ campo: campo.key, modo } as Filtro)
  }
  const placeholder = campo.formato === 'mmss' ? 'MM:SS' : campo.unidade ?? ''

  return (
    <div className={`rounded-xl border px-3 py-2 ${filtroAtivo(filtro) ? 'border-sky-200 bg-sky-50/50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-navy-500">{campo.label}</span>
        <select value={filtro.modo} onChange={(e) => mudarModo(e.target.value as Filtro['modo'])} className={inputCls}>
          {modosPorTipo[campo.tipo].map(([m, l]) => <option key={m} value={m}>{l}</option>)}
        </select>
        {filtro.modo === 'faixa' && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <input
              type={campo.tipo === 'data' ? 'date' : 'text'} inputMode={campo.tipo === 'data' ? undefined : 'decimal'}
              value={filtro.min ?? ''} placeholder={`mín. ${placeholder}`.trim()}
              onChange={(e) => onChange({ ...filtro, min: e.target.value })} className={`${inputCls} w-32`}
            />
            e
            <input
              type={campo.tipo === 'data' ? 'date' : 'text'} inputMode={campo.tipo === 'data' ? undefined : 'decimal'}
              value={filtro.max ?? ''} placeholder={`máx. ${placeholder}`.trim()}
              onChange={(e) => onChange({ ...filtro, max: e.target.value })} className={`${inputCls} w-32`}
            />
          </span>
        )}
        {filtro.modo === 'contem' && (
          <input
            value={filtro.texto} autoFocus placeholder="texto…"
            onChange={(e) => onChange({ ...filtro, texto: e.target.value })} className={`${inputCls} w-48`}
          />
        )}
        <button onClick={onRemove} title="Remover filtro" className="ml-auto p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
          <X size={14} />
        </button>
      </div>
      {filtro.modo === 'valores' && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {opcoes.length === 0 && <span className="text-xs text-gray-400">Nenhum valor registrado.</span>}
          {opcoes.map((o) => {
            const on = filtro.valores.includes(o)
            return (
              <button
                key={o}
                onClick={() => onChange({ ...filtro, valores: on ? filtro.valores.filter((x) => x !== o) : [...filtro.valores, o] })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  on ? 'bg-navy-500 text-white border-navy-500' : 'bg-white text-gray-600 border-gray-200 hover:border-sky-400'
                }`}
              >
                {o}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function RelatorioAtletas({
  linhasRecentes,
  linhasAvaliacoes,
  campos,
}: {
  linhasRecentes: Linha[]
  linhasAvaliacoes: Linha[]
  campos: Campo[]
}) {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL)
  const [mostrarColunas, setMostrarColunas] = useState(false)

  // Estado na URL: dá para salvar o relatório nos favoritos ou mandar o link.
  useEffect(() => {
    const salvo = lerEstadoDaUrl()
    if (salvo) setEstado(salvo) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('r', JSON.stringify(estado))
    window.history.replaceState(null, '', url)
  }, [estado])

  const periodo = estado.base.tipo === 'periodo'
  const camposDaBase = useMemo(
    // "atleta" = só no modo mais recente (inclui a evolução); "avaliacao" = só no período.
    () => campos.filter((c) => !c.visao || c.visao === (periodo ? 'avaliacao' : 'atleta')),
    [campos, periodo],
  )
  const mapaCampos = useMemo(() => new Map(camposDaBase.map((c) => [c.key, c])), [camposDaBase])

  // Linhas-base: mais recente (uma por atleta) ou todas as avaliações do período.
  const linhasBase = useMemo(() => {
    if (estado.base.tipo === 'recente') return linhasRecentes
    const { de, ate } = estado.base
    return linhasAvaliacoes.filter((l) => {
      const d = String(l.data_avaliacao ?? '')
      return (!de || d >= de) && (!ate || d <= ate)
    })
  }, [estado.base, linhasRecentes, linhasAvaliacoes])

  const resultado = useMemo(() => {
    let linhas = aplicarFiltros(linhasBase, estado.filtros, mapaCampos)
    if (periodo) {
      // Um atleta por linha: a avaliação mais recente que atende aos critérios.
      const vistos = new Set<string>()
      linhas = linhas.filter((l) => !vistos.has(l._alunoId) && vistos.add(l._alunoId))
    }
    const { campo, dir } = estado.ordem
    const sinal = dir === 'asc' ? 1 : -1
    return [...linhas].sort((a, b) => {
      const va = a[campo] ?? null, vb = b[campo] ?? null
      if (va == null || vb == null) return comparar(va, vb) || comparar(a.nome, b.nome)
      return sinal * comparar(va, vb) || comparar(a.nome, b.nome)
    })
  }, [linhasBase, estado.filtros, estado.ordem, mapaCampos, periodo])

  // Opções dos filtros de lista: os valores que existem nos dados.
  const chavesLista = estado.filtros.filter((f) => f.modo === 'valores').map((f) => f.campo).join('|')
  const opcoes = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const key of chavesLista.split('|').filter(Boolean)) {
      const vals = new Set<string>()
      for (const l of linhasBase) { const v = l[key]; if (v != null && v !== '') vals.add(String(v)) }
      m.set(key, [...vals].sort((a, b) => comparar(a, b)))
    }
    return m
  }, [linhasBase, chavesLista])

  const colunas = estado.colunas.filter((k) => mapaCampos.has(k) && k !== 'nome').map((k) => mapaCampos.get(k)!)
  const nomeCampo = mapaCampos.get('nome')!

  const set = (p: Partial<Estado>) => setEstado((e) => ({ ...e, ...p }))
  function adicionarFiltro(key: string) {
    const c = mapaCampos.get(key)
    if (!c) return
    setEstado((e) => ({
      ...e,
      filtros: [...e.filtros, filtroNovo(c)],
      colunas: e.colunas.includes(key) ? e.colunas : [...e.colunas, key],
    }))
  }
  function ordenarPor(key: string) {
    setEstado((e) => ({ ...e, ordem: { campo: key, dir: e.ordem.campo === key && e.ordem.dir === 'asc' ? 'desc' : 'asc' } }))
  }
  function mudarBase(tipo: Base['tipo']) {
    setEstado((e) => {
      const base: Base = tipo === 'periodo' ? { tipo, de: '', ate: '' } : { tipo }
      const trocar = (k: string) => (tipo === 'periodo' ? (k === 'ultima_avaliacao' ? 'data_avaliacao' : k) : (k === 'data_avaliacao' ? 'ultima_avaliacao' : k))
      return { ...e, base, colunas: [...new Set(e.colunas.map(trocar))] }
    })
  }

  const filtrosValidos = estado.filtros.filter((f) => mapaCampos.has(f.campo))

  return (
    <div className="space-y-4">
      {/* Atalhos */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400 mr-1">Prontos:</span>
        {PRONTOS.map((p) => (
          <button
            key={p.nome}
            onClick={() => setEstado({ ...ESTADO_INICIAL, ...p.estado })}
            className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:border-sky-400 hover:text-sky-500"
          >
            {p.nome}
          </button>
        ))}
        <button
          onClick={() => setEstado(ESTADO_INICIAL)}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-gray-400 hover:text-navy-500"
        >
          <RotateCcw size={12} /> Limpar
        </button>
      </div>

      <Card>
        {/* Qual avaliação conta */}
        <div className="flex flex-wrap items-center gap-2 text-sm mb-4 pb-4 border-b border-gray-100">
          <span className="text-gray-500">Critérios de avaliação usam:</span>
          <select value={estado.base.tipo} onChange={(e) => mudarBase(e.target.value as Base['tipo'])} className={inputCls}>
            <option value="recente">o resultado mais recente de cada teste</option>
            <option value="periodo">alguma avaliação feita entre…</option>
          </select>
          {estado.base.tipo === 'periodo' && (
            <span className="flex items-center gap-1.5 text-gray-500">
              <input type="date" value={estado.base.de} className={inputCls}
                onChange={(e) => set({ base: { ...(estado.base as Extract<Base, { tipo: 'periodo' }>), de: e.target.value } })} />
              e
              <input type="date" value={estado.base.ate} className={inputCls}
                onChange={(e) => set({ base: { ...(estado.base as Extract<Base, { tipo: 'periodo' }>), ate: e.target.value } })} />
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="space-y-2">
          {filtrosValidos.map((f) => {
            const i = estado.filtros.indexOf(f)
            return (
              <EditorFiltro
                key={i}
                filtro={f}
                campo={mapaCampos.get(f.campo)!}
                opcoes={opcoes.get(f.campo) ?? []}
                onChange={(nf) => set({ filtros: estado.filtros.map((x, j) => (j === i ? nf : x)) })}
                onRemove={() => set({ filtros: estado.filtros.filter((_, j) => j !== i) })}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <label className="inline-flex items-center gap-1.5 text-sm text-sky-500">
            <Plus size={14} />
            <select
              value=""
              onChange={(e) => { adicionarFiltro(e.target.value); e.target.value = '' }}
              className="bg-transparent text-sky-500 font-medium focus:outline-none cursor-pointer"
            >
              <option value="">Adicionar filtro…</option>
              {GRUPOS.map((g) => {
                const doGrupo = camposDaBase.filter((c) => c.grupo === g)
                return doGrupo.length ? (
                  <optgroup key={g} label={g}>
                    {doGrupo.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                ) : null
              })}
            </select>
          </label>
          <button
            onClick={() => setMostrarColunas((v) => !v)}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-500"
          >
            <Columns3 size={14} /> Colunas ({colunas.length + 1})
          </button>
        </div>

        {mostrarColunas && (
          <div className="mt-3 pt-3 border-t border-gray-100 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GRUPOS.map((g) => {
              const doGrupo = camposDaBase.filter((c) => c.grupo === g && c.key !== 'nome')
              if (!doGrupo.length) return null
              return (
                <div key={g}>
                  <p className="text-xs font-semibold text-gray-500 mb-1">{g}</p>
                  {doGrupo.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700 py-0.5">
                      <input
                        type="checkbox"
                        checked={estado.colunas.includes(c.key)}
                        onChange={(e) => set({ colunas: e.target.checked ? [...estado.colunas, c.key] : estado.colunas.filter((k) => k !== c.key) })}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Resultado */}
      <Card padding={false}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <p className="text-sm font-semibold text-navy-500">
            {resultado.length} atleta{resultado.length !== 1 ? 's' : ''}
          </p>
          {periodo && <p className="text-xs text-gray-400">· valores da avaliação mais recente que atende aos critérios</p>}
        </div>
        {resultado.length === 0 ? (
          <p className="px-4 py-8 text-sm text-gray-400 text-center">Nenhum atleta atende a todos os filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[nomeCampo, ...colunas].map((c, i) => (
                    <th
                      key={c.key}
                      className={`text-left px-4 py-2.5 text-xs font-medium text-gray-500 whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-gray-50 z-10' : ''}`}
                    >
                      <button onClick={() => ordenarPor(c.key)} className="inline-flex items-center gap-1 hover:text-navy-500">
                        {c.label}{c.unidade && c.formato !== 'mmss' ? ` (${c.unidade})` : ''}
                        {estado.ordem.campo === c.key && (estado.ordem.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resultado.map((l) => (
                  <tr key={l._avaliacaoId ?? l._alunoId} className="hover:bg-gray-50">
                    <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap z-10">
                      <Link href={`/alunos/${l._alunoId}`} className="font-medium text-navy-500 hover:text-sky-500">
                        {String(l.nome)}
                      </Link>
                    </td>
                    {colunas.map((c) => (
                      <td key={c.key} className={`px-4 py-2 ${c.tipo === 'texto' ? 'min-w-[12rem]' : 'whitespace-nowrap'} ${corDoValor(l[c.key] ?? null)}`}>
                        {formatar(l[c.key] ?? null, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
