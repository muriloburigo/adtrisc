import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatDate, idadeNaData, secondsToMmss } from '@/lib/utils'
import { classificarProesp } from '@/lib/proesp'
import { calcularMaturacao, type ResultadoMaturacao } from '@/lib/maturacao'
import { zonasCorrida, zonasCiclismo, minSeg } from '@/lib/zonas'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import type { AvaliacaoFisicaRow, SexoEnum } from '@/types/database'

type Aluno = { id: string; nome: string; sexo: string | null; data_nascimento: string | null; foto_url: string | null }

export type OrdemDesempenho = 'nome' | 'avaliacao' | 'maturacao' | 'corrida' | 'ciclismo' | 'natacao' | 'proesp'
export type Direcao = 'asc' | 'desc'

// Acima disso a data da última avaliação aparece em destaque.
const DIAS_AVALIACAO_ANTIGA = 180

const NOME_TESTE: Record<string, string> = {
  imc: 'IMC', rce: 'RCE', resistencia_6min: 'Resistência 6 min', sentar_alcancar: 'Sentar e alcançar',
  forca_abdominal: 'Abdominal', arremesso_medicineball: 'Medicine ball', salto_horizontal: 'Salto horizontal',
  agilidade: 'Agilidade', corrida_20m: 'Corrida 20 m',
}
const CAMPOS_PROESP = Object.keys(NOME_TESTE) as (keyof AvaliacaoFisicaRow)[]

type Resultado<T> = { data: string; valor: T } | null

type Linha = {
  aluno: Aluno
  ultimaAvaliacao: string | null
  maturacao: Resultado<ResultadoMaturacao>
  corrida: Resultado<number>     // m em 5 min
  ciclismo: Resultado<number>    // s em 2 km
  natacao100: Resultado<number>  // s
  natacao12: Resultado<number>   // m em 12 min (quando não há 100 m)
  proesp: { data: string; riscos: string[]; fora: boolean } | null
}

// Cada coluna usa o teste mais recente daquele dado — a avaliação é por data e
// um teste pode ter sido refeito sozinho (ex.: Dabonneville no meio do semestre).
function montarLinha(aluno: Aluno, avs: AvaliacaoFisicaRow[]): Linha {
  const recente = <K extends keyof AvaliacaoFisicaRow>(campo: K): Resultado<number> => {
    const av = avs.find((a) => a[campo] != null)
    return av ? { data: av.data, valor: Number(av[campo]) } : null
  }
  const sexo = (aluno.sexo === 'M' || aluno.sexo === 'F' ? aluno.sexo : null) as SexoEnum | null

  let maturacao: Resultado<ResultadoMaturacao> = null
  for (const av of avs) {
    const r = calcularMaturacao({
      sexo,
      dataNascimento: aluno.data_nascimento,
      dataAvaliacao: av.data,
      estaturaCm: av.estatura != null ? av.estatura * 100 : null,
      massaKg: av.massa_corporal,
      sentadoCm: av.estatura_sentado != null ? av.estatura_sentado * 100 : null,
      alturaBancoCm: av.altura_banco,
    })
    if (r) { maturacao = { data: av.data, valor: r }; break }
  }

  // PROESP: a avaliação mais recente que tenha algum teste classificável.
  let proesp: Linha['proesp'] = null
  const avProesp = avs.find((a) => CAMPOS_PROESP.some((c) => a[c] != null))
  if (avProesp && sexo && aluno.data_nascimento) {
    const c = classificarProesp(avProesp, sexo, idadeNaData(aluno.data_nascimento, avProesp.data))
    const riscos = Object.entries(c).filter(([, v]) => v.saude === 'risco').map(([k]) => NOME_TESTE[k] ?? k)
    proesp = { data: avProesp.data, riscos, fora: Object.keys(c).length === 0 }
  }

  const natacao100 = recente('natacao_100m')
  return {
    aluno,
    ultimaAvaliacao: avs[0]?.data ?? null,
    maturacao,
    corrida: recente('resistencia_5min_dabonneville'),
    ciclismo: recente('ciclismo_2km_tempo'),
    natacao100,
    natacao12: natacao100 ? null : recente('natacao_12min'),
    proesp,
  }
}

// Valor usado na ordenação; null vai sempre para o fim.
function chave(l: Linha, ordem: OrdemDesempenho): number | string | null {
  switch (ordem) {
    case 'nome':      return l.aluno.nome
    case 'avaliacao': return l.ultimaAvaliacao
    case 'maturacao': return l.maturacao?.valor.offset ?? null
    case 'corrida':   return l.corrida?.valor ?? null
    case 'ciclismo':  return l.ciclismo?.valor ?? null
    case 'natacao':   return l.natacao100?.valor ?? null
    case 'proesp':    return l.proesp && !l.proesp.fora ? l.proesp.riscos.length : null
  }
}

// Direção padrão de cada coluna ao clicar: o "melhor" (ou mais urgente) primeiro.
export const DIRECAO_PADRAO: Record<OrdemDesempenho, Direcao> = {
  nome: 'asc', avaliacao: 'asc', maturacao: 'asc', corrida: 'desc', ciclismo: 'asc', natacao: 'asc', proesp: 'desc',
}

function ordenar(linhas: Linha[], ordem: OrdemDesempenho, dir: Direcao) {
  const sinal = dir === 'asc' ? 1 : -1
  return [...linhas].sort((a, b) => {
    const ka = chave(a, ordem), kb = chave(b, ordem)
    if (ka == null && kb == null) return a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR')
    if (ka == null) return 1
    if (kb == null) return -1
    const cmp = typeof ka === 'string' ? ka.localeCompare(kb as string, 'pt-BR') : ka - (kb as number)
    return cmp * sinal || a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR')
  })
}

const diasDesde = (data: string) => Math.floor((Date.now() - new Date(`${data}T12:00:00`).getTime()) / 86_400_000)
const kmh = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const vazio = <span className="text-gray-300">—</span>

function CelAvaliacao({ l }: { l: Linha }) {
  if (!l.ultimaAvaliacao) return <Badge variant="red">Sem avaliação</Badge>
  const antiga = diasDesde(l.ultimaAvaliacao) > DIAS_AVALIACAO_ANTIGA
  return antiga
    ? <Badge variant="yellow">{formatDate(l.ultimaAvaliacao)}</Badge>
    : <span className="text-gray-700">{formatDate(l.ultimaAvaliacao)}</span>
}

function CelMaturacao({ l }: { l: Linha }) {
  if (!l.maturacao) return vazio
  const { offset, classificacao } = l.maturacao.valor
  return (
    <span title={`Avaliação de ${formatDate(l.maturacao.data)}`}>
      <span className="text-gray-700">{classificacao}</span>
      <span className="block text-[11px] text-gray-400">{offset > 0 ? '+' : ''}{offset.toLocaleString('pt-BR')} anos</span>
    </span>
  )
}

function CelCorrida({ l, limites }: { l: Linha; limites: number[] }) {
  if (!l.corrida) return vazio
  const r = zonasCorrida(l.corrida.valor, limites)
  return (
    <span title={`Dabonneville 5' de ${formatDate(l.corrida.data)}`}>
      <span className="text-gray-700 tabular-nums">{l.corrida.valor.toLocaleString('pt-BR')} m</span>
      <span className="block text-[11px] text-gray-400 tabular-nums">{minSeg(r.paceSKm)}/km</span>
    </span>
  )
}

function CelCiclismo({ l, limites }: { l: Linha; limites: number[] }) {
  if (!l.ciclismo) return vazio
  const r = zonasCiclismo(l.ciclismo.valor, limites)
  return (
    <span title={`Ciclismo 2 km de ${formatDate(l.ciclismo.data)}`}>
      <span className="text-gray-700 tabular-nums">{secondsToMmss(l.ciclismo.valor)}</span>
      <span className="block text-[11px] text-gray-400 tabular-nums">{kmh(r.kmh)} km/h</span>
    </span>
  )
}

function CelNatacao({ l, corte }: { l: Linha; corte: number | null }) {
  if (l.natacao100) {
    const apto = corte != null && l.natacao100.valor <= corte
    return (
      <span title={`100 m de ${formatDate(l.natacao100.data)}`} className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-gray-700 tabular-nums">{secondsToMmss(l.natacao100.valor)}</span>
        {apto && <Badge variant="green">Apto</Badge>}
      </span>
    )
  }
  if (l.natacao12) {
    return (
      <span title={`Teste de 12 min de ${formatDate(l.natacao12.data)} (sem 100 m registrado)`} className="text-gray-500 tabular-nums">
        12&apos;: {l.natacao12.valor.toLocaleString('pt-BR')} m
      </span>
    )
  }
  return vazio
}

function CelProesp({ l }: { l: Linha }) {
  if (!l.proesp) return vazio
  if (l.proesp.fora) return <span className="text-gray-300" title="Fora da faixa de 6 a 17 anos">—</span>
  const titulo = `Avaliação de ${formatDate(l.proesp.data)}`
  return l.proesp.riscos.length === 0
    ? <span title={titulo}><Badge variant="green">OK</Badge></span>
    : <span title={`${titulo} — zona de risco: ${l.proesp.riscos.join(', ')}`}><Badge variant="red">{l.proesp.riscos.length} em risco</Badge></span>
}

function Cabecalho({
  col, turmaId, ordem, dir, children,
}: {
  col: OrdemDesempenho; turmaId: string; ordem: OrdemDesempenho; dir: Direcao; children: React.ReactNode
}) {
  const ativa = ordem === col
  const proxima: Direcao = ativa ? (dir === 'asc' ? 'desc' : 'asc') : DIRECAO_PADRAO[col]
  return (
    <th className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">
      <Link
        href={`/turmas/${turmaId}?aba=desempenho&ordem=${col}&dir=${proxima}`}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-navy-500 ${ativa ? 'text-navy-500' : ''}`}
      >
        {children}
        {ativa && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </Link>
    </th>
  )
}

export default async function DesempenhoTurma({
  turmaId,
  alunos,
  ordem,
  dir,
}: {
  turmaId: string
  alunos: Aluno[]
  ordem: OrdemDesempenho
  dir: Direcao
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const [{ data: avsRaw }, config] = await Promise.all([
    supabase
      .from('avaliacoes_fisicas')
      .select('*')
      .in('aluno_id', alunos.map((a) => a.id))
      .is('deleted_at', null)
      .order('data', { ascending: false }),
    getConfigAvaliacao(supabase),
  ])

  const porAluno = new Map<string, AvaliacaoFisicaRow[]>()
  for (const av of (avsRaw ?? []) as AvaliacaoFisicaRow[]) {
    if (!porAluno.has(av.aluno_id)) porAluno.set(av.aluno_id, [])
    porAluno.get(av.aluno_id)!.push(av)
  }
  const linhas = ordenar(alunos.map((a) => montarLinha(a, porAluno.get(a.id) ?? [])), ordem, dir)
  const limites = config.zona_limites
  const corte = config.natacao_100m_corte_s
  const cab = { turmaId, ordem, dir }

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {linhas.map((l) => (
          <Link key={l.aluno.id} href={`/alunos/${l.aluno.id}`} className="block px-4 py-3.5 hover:bg-gray-50">
            <div className="flex items-center gap-3 mb-2">
              <Avatar name={l.aluno.nome} url={l.aluno.foto_url} size={32} />
              <p className="font-medium text-navy-500 truncate flex-1">{l.aluno.nome}</p>
              <CelProesp l={l} />
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><dt className="text-gray-400">Últ. avaliação</dt><dd><CelAvaliacao l={l} /></dd></div>
              <div><dt className="text-gray-400">Maturação</dt><dd><CelMaturacao l={l} /></dd></div>
              <div><dt className="text-gray-400">Dabonneville 5&apos;</dt><dd><CelCorrida l={l} limites={limites} /></dd></div>
              <div><dt className="text-gray-400">Ciclismo 2 km</dt><dd><CelCiclismo l={l} limites={limites} /></dd></div>
              <div><dt className="text-gray-400">Natação</dt><dd><CelNatacao l={l} corte={corte} /></dd></div>
            </dl>
          </Link>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-12 px-4 py-3" />
              <Cabecalho {...cab} col="nome">Nome</Cabecalho>
              <Cabecalho {...cab} col="avaliacao">Últ. avaliação</Cabecalho>
              <Cabecalho {...cab} col="maturacao">Maturação</Cabecalho>
              <Cabecalho {...cab} col="corrida">Dabonneville 5&apos;</Cabecalho>
              <Cabecalho {...cab} col="ciclismo">Ciclismo 2 km</Cabecalho>
              <Cabecalho {...cab} col="natacao">Natação 100 m</Cabecalho>
              <Cabecalho {...cab} col="proesp">PROESP</Cabecalho>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {linhas.map((l) => (
              <tr key={l.aluno.id} className="hover:bg-gray-50 align-top">
                <td className="px-4 py-2.5"><Avatar name={l.aluno.nome} url={l.aluno.foto_url} size={32} /></td>
                <td className="px-4 py-3.5">
                  <Link href={`/alunos/${l.aluno.id}`} className="font-medium text-navy-500 hover:text-sky-400 transition-colors">
                    {l.aluno.nome}
                  </Link>
                </td>
                <td className="px-4 py-3.5"><CelAvaliacao l={l} /></td>
                <td className="px-4 py-3.5"><CelMaturacao l={l} /></td>
                <td className="px-4 py-3.5"><CelCorrida l={l} limites={limites} /></td>
                <td className="px-4 py-3.5"><CelCiclismo l={l} limites={limites} /></td>
                <td className="px-4 py-3.5"><CelNatacao l={l} corte={corte} /></td>
                <td className="px-4 py-3.5"><CelProesp l={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 px-4 py-3 border-t border-gray-100">
        Cada coluna mostra o teste mais recente daquele dado (passe o mouse para ver a data). Data em amarelo:
        avaliação com mais de 6 meses. PROESP: testes em zona de risco na última avaliação —{' '}
        <Link href="/avaliacoes/referencia" className="text-sky-500 hover:underline">ver referências</Link>.
      </p>
    </>
  )
}
