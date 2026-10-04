// Relatórios de atletas: definição dos campos, montagem das linhas (servidor)
// e aplicação dos filtros (cliente — os resultados mudam na hora, sem recarregar).
//
// Duas visões:
//  - "atleta":    uma linha por atleta; cada teste traz o resultado mais recente
//                 daquele teste (como na aba Desempenho da turma);
//  - "avaliacao": uma linha por avaliação feita, com a data.
// Classificação PROESP, maturação e "apto" usam as mesmas funções da página do
// atleta, então o relatório mostra exatamente o que o resto do sistema mostra.

import { classificarProesp, SAUDE, DESEMPENHO, type ClassificacaoTeste } from '@/lib/proesp'
import { calcularMaturacao } from '@/lib/maturacao'
import { idadeNaData, calcularIdade } from '@/lib/utils'
import type { AvaliacaoFisicaRow, SexoEnum } from '@/types/database'

export type Visao = 'atleta' | 'avaliacao'
export type Tipo = 'texto' | 'lista' | 'numero' | 'data' | 'simnao'
export type Formato = 'mmss' | 'dec1' | 'dec2' | 'int'
export type Valor = string | number | boolean | null
export type Linha = Record<string, Valor> & { _alunoId: string; _avaliacaoId?: string }

export type Campo = {
  key: string
  label: string
  grupo: string
  tipo: Tipo
  formato?: Formato
  unidade?: string
  visao?: Visao   // só aparece nesta visão (sem = nas duas)
  admin?: boolean // só admin vê (CPF/RG)
  sinal?: boolean // mostra "+" nos positivos (evolução)
}

export const GRUPOS = [
  'Cadastro', 'Responsáveis', 'Ficha: saúde', 'Ficha: escola e outros',
  'Avaliação', 'Medidas', 'Testes PROESP', 'Classificação PROESP', 'Testes de campo', 'Maturação', 'Evolução', 'Treinos',
]

// Testes com classificação PROESP (mesmos rótulos da página da avaliação).
const TESTES_PROESP: { key: string; label: string }[] = [
  { key: 'imc', label: 'IMC' },
  { key: 'rce', label: 'RCE' },
  { key: 'resistencia_6min', label: 'Resistência 6 min' },
  { key: 'sentar_alcancar', label: 'Sentar e alcançar' },
  { key: 'forca_abdominal', label: 'Abdominal' },
  { key: 'arremesso_medicineball', label: 'Medicine ball' },
  { key: 'salto_horizontal', label: 'Salto horizontal' },
  { key: 'agilidade', label: 'Agilidade' },
  { key: 'corrida_20m', label: 'Corrida 20 m' },
]
const TEM_SAUDE = new Set([...Object.keys(SAUDE), 'rce'])
const TEM_NIVEL = new Set(Object.keys(DESEMPENHO))

// Colunas da avaliação: [coluna no banco, rótulo, unidade, formato, fator]
// fator converte a unidade do banco para a exibida (estatura: m → cm).
const MEDIDAS: [string, string, string, Formato, number][] = [
  ['massa_corporal', 'Massa', 'kg', 'dec1', 1],
  ['estatura', 'Estatura', 'cm', 'dec1', 100],
  ['envergadura', 'Envergadura', 'cm', 'dec1', 100],
  ['estatura_sentado', 'Estatura sentado', 'cm', 'dec1', 100],
  ['perimetro_cintura', 'Circunferência abdominal', 'cm', 'dec1', 1],
  ['imc', 'IMC', 'kg/m²', 'dec1', 1],
  ['rce', 'RCE', '', 'dec2', 1],
]
const TESTES: [string, string, string, Formato, number][] = [
  ['resistencia_6min', 'Resistência 6 min', 'm', 'int', 1],
  ['sentar_alcancar', 'Sentar e alcançar', 'cm', 'dec1', 1],
  ['forca_abdominal', 'Abdominal (1 min)', 'rep', 'int', 1],
  ['arremesso_medicineball', 'Medicine ball', 'm', 'dec2', 1],
  ['salto_horizontal', 'Salto horizontal', 'm', 'dec2', 1],
  ['agilidade', 'Agilidade', 's', 'dec2', 1],
  ['corrida_20m', 'Corrida 20 m', 's', 'dec2', 1],
]
const CAMPO_TESTES: [string, string, string, Formato, number][] = [
  ['resistencia_5min_dabonneville', "Dabonneville 5'", 'm', 'int', 1],
  ['ciclismo_2km_tempo', 'Ciclismo 2 km', 'MM:SS', 'mmss', 1],
  ['ciclismo_2km_velocidade', 'Ciclismo 2 km (velocidade)', 'km/h', 'dec1', 1],
  ['natacao_12min', "Natação 12'", 'm', 'int', 1],
  ['natacao_50m', 'Natação 50 m', 'MM:SS', 'mmss', 1],
  ['natacao_100m', 'Natação 100 m', 'MM:SS', 'mmss', 1],
]
const TODAS_MEDIDAS = [...MEDIDAS, ...TESTES, ...CAMPO_TESTES]

// Evolução entre os dois resultados mais recentes de cada teste (visão por atleta).
// Testes de tempo: menor é melhor. A velocidade do ciclismo repete o tempo, fica de fora.
const MENOR_MELHOR = new Set(['agilidade', 'corrida_20m', 'ciclismo_2km_tempo', 'natacao_50m', 'natacao_100m'])
const TESTES_EVOLUCAO = [...TESTES, ...CAMPO_TESTES].filter(([k]) => k !== 'ciclismo_2km_velocidade')
const unidadeEvolucao = (u: string, f: Formato) => (f === 'mmss' ? 's' : u)
const formatoEvolucao = (f: Formato): Formato => (f === 'mmss' ? 'dec2' : f)

const n = (key: string, label: string, grupo: string, unidade?: string, formato?: Formato): Campo =>
  ({ key, label, grupo, tipo: 'numero', unidade, formato })

export const CAMPOS: Campo[] = [
  // Cadastro
  { key: 'nome', label: 'Nome', grupo: 'Cadastro', tipo: 'texto' },
  { key: 'turma', label: 'Turma', grupo: 'Cadastro', tipo: 'lista' },
  { key: 'status', label: 'Status', grupo: 'Cadastro', tipo: 'lista' },
  { key: 'sexo', label: 'Sexo', grupo: 'Cadastro', tipo: 'lista' },
  n('idade', 'Idade (hoje)', 'Cadastro', 'anos', 'int'),
  { key: 'data_nascimento', label: 'Nascimento', grupo: 'Cadastro', tipo: 'data' },
  { key: 'telefone', label: 'Telefone', grupo: 'Cadastro', tipo: 'texto' },
  { key: 'endereco', label: 'Endereço', grupo: 'Cadastro', tipo: 'texto' },
  { key: 'bairro', label: 'Bairro', grupo: 'Cadastro', tipo: 'lista' },
  { key: 'cidade', label: 'Cidade', grupo: 'Cadastro', tipo: 'lista' },
  { key: 'cep', label: 'CEP', grupo: 'Cadastro', tipo: 'texto' },
  { key: 'cadastrado_em', label: 'Cadastrado em', grupo: 'Cadastro', tipo: 'data' },
  { key: 'observacoes', label: 'Observações', grupo: 'Cadastro', tipo: 'texto' },
  // Responsáveis
  ...(['mae', 'pai'] as const).flatMap((p) => {
    const quem = p === 'mae' ? 'Mãe' : 'Pai'
    return [
      { key: `${p}_nome`, label: `${quem}: nome`, grupo: 'Responsáveis', tipo: 'texto' as Tipo },
      { key: `${p}_telefone`, label: `${quem}: telefone`, grupo: 'Responsáveis', tipo: 'texto' as Tipo },
      { key: `${p}_email`, label: `${quem}: e-mail`, grupo: 'Responsáveis', tipo: 'texto' as Tipo },
      { key: `${p}_cpf`, label: `${quem}: CPF`, grupo: 'Responsáveis', tipo: 'texto' as Tipo, admin: true },
      { key: `${p}_rg`, label: `${quem}: RG`, grupo: 'Responsáveis', tipo: 'texto' as Tipo, admin: true },
    ]
  }),
  // Ficha — saúde
  { key: 'ficha_situacao', label: 'Ficha de inscrição', grupo: 'Ficha: saúde', tipo: 'lista' },
  { key: 'ficha_preenchida_em', label: 'Ficha preenchida em', grupo: 'Ficha: saúde', tipo: 'data' },
  { key: 'condicao_medica', label: 'Condição médica / restrição', grupo: 'Ficha: saúde', tipo: 'simnao' },
  { key: 'condicao_medica_descricao', label: 'Condição médica (descrição)', grupo: 'Ficha: saúde', tipo: 'texto' },
  { key: 'tratamento_medico', label: 'Tratamento / medicação contínua', grupo: 'Ficha: saúde', tipo: 'simnao' },
  { key: 'tratamento_medico_descricao', label: 'Tratamento (descrição)', grupo: 'Ficha: saúde', tipo: 'texto' },
  { key: 'alergia', label: 'Alergia', grupo: 'Ficha: saúde', tipo: 'simnao' },
  { key: 'alergia_descricao', label: 'Alergia (descrição)', grupo: 'Ficha: saúde', tipo: 'texto' },
  { key: 'autorizacao_medica', label: 'Autorização médica', grupo: 'Ficha: saúde', tipo: 'simnao' },
  // Ficha — escola e outros
  { key: 'cpf', label: 'CPF do atleta', grupo: 'Ficha: escola e outros', tipo: 'texto', admin: true },
  { key: 'escola', label: 'Escola', grupo: 'Ficha: escola e outros', tipo: 'texto' },
  { key: 'serie_escolar', label: 'Série / ano escolar', grupo: 'Ficha: escola e outros', tipo: 'lista' },
  { key: 'praticou_modalidade', label: 'Já praticou modalidade', grupo: 'Ficha: escola e outros', tipo: 'simnao' },
  { key: 'interesse_eventos', label: 'Interesse em eventos', grupo: 'Ficha: escola e outros', tipo: 'simnao' },
  { key: 'como_soube', label: 'Como soube do projeto', grupo: 'Ficha: escola e outros', tipo: 'lista' },
  { key: 'tem_bicicleta', label: 'Tem bicicleta', grupo: 'Ficha: escola e outros', tipo: 'simnao' },
  { key: 'tamanho_camiseta', label: 'Camiseta', grupo: 'Ficha: escola e outros', tipo: 'lista' },
  // Avaliação
  { key: 'data_avaliacao', label: 'Data da avaliação', grupo: 'Avaliação', tipo: 'data', visao: 'avaliacao' },
  n('idade_avaliacao', 'Idade na avaliação', 'Avaliação', 'anos', 'int'),
  { key: 'ultima_avaliacao', label: 'Última avaliação', grupo: 'Avaliação', tipo: 'data', visao: 'atleta' },
  { ...n('num_avaliacoes', 'Nº de avaliações', 'Avaliação', '', 'int'), visao: 'atleta' },
  ...MEDIDAS.map(([k, l, u, f]) => n(k, l, 'Medidas', u, f)),
  ...TESTES.map(([k, l, u, f]) => n(k, l, 'Testes PROESP', u, f)),
  ...TESTES_PROESP.filter((t) => TEM_NIVEL.has(t.key))
    .map((t) => ({ key: `nivel_${t.key}`, label: `${t.label}: nível`, grupo: 'Classificação PROESP', tipo: 'lista' as Tipo })),
  ...TESTES_PROESP.filter((t) => TEM_SAUDE.has(t.key))
    .map((t) => ({ key: `saude_${t.key}`, label: `${t.label}: zona de saúde`, grupo: 'Classificação PROESP', tipo: 'lista' as Tipo })),
  n('testes_em_risco', 'Nº de testes em zona de risco', 'Classificação PROESP', '', 'int'),
  ...CAMPO_TESTES.map(([k, l, u, f]) => n(k, l, 'Testes de campo', u, f)),
  { key: 'apto_equipe', label: 'Apto para a equipe (100 m)', grupo: 'Testes de campo', tipo: 'simnao' },
  n('maturacao_offset', 'Maturity offset', 'Maturação', 'anos', 'dec2'),
  { key: 'maturacao_classificacao', label: 'Maturação', grupo: 'Maturação', tipo: 'lista' },
  n('idade_phv', 'Idade prevista do PHV', 'Maturação', 'anos', 'dec1'),
  // Evolução (só na visão por atleta: compara as duas avaliações mais recentes do teste)
  ...TESTES_EVOLUCAO.flatMap(([k, l, u, f]): Campo[] => [
    { key: `tend_${k}`, label: `${l}: evolução`, grupo: 'Evolução', tipo: 'lista', visao: 'atleta' },
    { key: `melhora_${k}`, label: `${l}: melhora`, grupo: 'Evolução', tipo: 'numero', visao: 'atleta', sinal: true,
      unidade: unidadeEvolucao(u, f), formato: formatoEvolucao(f) },
  ]),
  ...MEDIDAS.map(([k, l, u, f]): Campo => (
    { key: `var_${k}`, label: `${l}: variação`, grupo: 'Evolução', tipo: 'numero', visao: 'atleta', sinal: true, unidade: u, formato: f })),
  { key: 'intervalo_avaliacoes', label: 'Dias entre as duas últimas avaliações', grupo: 'Evolução', tipo: 'numero', visao: 'atleta', formato: 'int' },
  // Treinos (módulo de treinos: só turmas com o módulo ligado têm valores)
  { key: 'treino_cumprimento_30d', label: 'Cumprimento dos treinos (30 dias)', grupo: 'Treinos', tipo: 'numero', visao: 'atleta', unidade: '%', formato: 'int' },
  { key: 'treino_feitos_30d', label: 'Treinos feitos (30 dias)', grupo: 'Treinos', tipo: 'numero', visao: 'atleta', formato: 'int' },
  { key: 'treino_planejados_30d', label: 'Treinos planejados (30 dias)', grupo: 'Treinos', tipo: 'numero', visao: 'atleta', formato: 'int' },
  { key: 'treino_ultimo', label: 'Último treino feito', grupo: 'Treinos', tipo: 'data', visao: 'atleta' },
  { key: 'portal_ativo', label: 'Tem acesso ao portal', grupo: 'Treinos', tipo: 'simnao', visao: 'atleta' },
  { key: 'intervals_conectado', label: 'Intervals.icu conectado', grupo: 'Treinos', tipo: 'simnao', visao: 'atleta' },
]

export const COLUNAS_PADRAO: Record<Visao, string[]> = {
  atleta: ['nome', 'turma', 'idade', 'ultima_avaliacao', 'maturacao_classificacao', 'resistencia_5min_dabonneville', 'testes_em_risco'],
  avaliacao: ['nome', 'turma', 'data_avaliacao', 'idade_avaliacao', 'massa_corporal', 'estatura', 'imc', 'testes_em_risco'],
}

export const camposVisiveis = (visao: Visao, admin: boolean) =>
  CAMPOS.filter((c) => (!c.visao || c.visao === visao) && (admin || !c.admin))

// ─────────────────────────────── montagem (servidor) ───────────────────────────────

export type AlunoFonte = {
  id: string; nome: string; sexo: string | null; data_nascimento: string | null; status: string
  telefone: string | null; rua: string | null; numero: string | null; bairro: string | null; cidade: string | null
  cep: string | null; observacoes: string | null; created_at: string; turma: string | null
}
export type RespFonte = { nome: string | null; telefone: string | null; email: string | null; cpf: string | null; rg: string | null }
export type FichaFonte = Record<string, unknown> & { status: string; preenchido_em: string | null; expires_at: string }

const NIVEL_ROTULO = (c?: ClassificacaoTeste) => c?.desempenho ?? null
const SAUDE_ROTULO = (c?: ClassificacaoTeste) => (c?.saude === 'risco' ? 'Zona de risco' : c?.saude === 'saudavel' ? 'Saudável' : null)
const limpa = (v: unknown) => (typeof v === 'string' ? v.trim() || null : v == null ? null : v) as Valor
const arred = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas

function dadosCadastro(a: AlunoFonte, resps: Record<string, RespFonte | undefined>, fichas: FichaFonte[]): Record<string, Valor> {
  const sexo = a.sexo === 'M' ? 'Masculino' : a.sexo === 'F' ? 'Feminino' : null
  const endereco = [[a.rua, a.numero].filter(Boolean).join(', '), a.bairro].filter(Boolean).join(' — ') || null
  const preenchida = fichas.find((f) => f.status === 'preenchida')
  const pendente = fichas.find((f) => f.status === 'pendente' && new Date(f.expires_at) >= new Date())
  const out: Record<string, Valor> = {
    nome: a.nome.trim(), turma: a.turma, status: a.status, sexo,
    idade: a.data_nascimento ? calcularIdade(a.data_nascimento) : null,
    data_nascimento: a.data_nascimento, telefone: limpa(a.telefone), endereco,
    bairro: limpa(a.bairro), cidade: limpa(a.cidade), cep: limpa(a.cep),
    cadastrado_em: a.created_at.slice(0, 10), observacoes: limpa(a.observacoes),
    ficha_situacao: preenchida ? 'Preenchida' : pendente ? 'Aguardando os pais' : fichas.length ? 'Expirada' : 'Sem ficha',
    ficha_preenchida_em: preenchida?.preenchido_em ? String(preenchida.preenchido_em).slice(0, 10) : null,
  }
  for (const p of ['mae', 'pai'] as const) {
    const r = resps[p]
    for (const c of ['nome', 'telefone', 'email', 'cpf', 'rg'] as const) out[`${p}_${c}`] = limpa(r?.[c])
  }
  // Campos da ficha só existem se os pais preencheram.
  const f = preenchida ?? {}
  for (const k of ['condicao_medica', 'condicao_medica_descricao', 'tratamento_medico', 'tratamento_medico_descricao',
    'alergia', 'alergia_descricao', 'autorizacao_medica', 'serie_escolar', 'praticou_modalidade', 'interesse_eventos',
    'como_soube', 'tem_bicicleta', 'tamanho_camiseta']) out[k] = limpa((f as Record<string, unknown>)[k])
  out.cpf = limpa((f as Record<string, unknown>).p_cpf)
  out.escola = limpa((f as Record<string, unknown>).escola_nome_endereco)
  return out
}

function valorMedida(av: AvaliacaoFisicaRow, col: string, fator: number): number | null {
  const v = av[col as keyof AvaliacaoFisicaRow] as number | null
  return v == null ? null : arred(Number(v) * fator, 2)
}

function maturacaoDe(a: AlunoFonte, av: AvaliacaoFisicaRow) {
  return calcularMaturacao({
    sexo: (a.sexo === 'M' || a.sexo === 'F' ? a.sexo : null) as SexoEnum | null,
    dataNascimento: a.data_nascimento, dataAvaliacao: av.data,
    estaturaCm: av.estatura != null ? av.estatura * 100 : null, massaKg: av.massa_corporal,
    sentadoCm: av.estatura_sentado != null ? av.estatura_sentado * 100 : null, alturaBancoCm: av.altura_banco,
  })
}

function classificar(a: AlunoFonte, av: AvaliacaoFisicaRow) {
  const sexo = (a.sexo === 'M' || a.sexo === 'F' ? a.sexo : null) as SexoEnum | null
  return classificarProesp(av, sexo, a.data_nascimento ? idadeNaData(a.data_nascimento, av.data) : null)
}

function dadosAvaliacao(a: AlunoFonte, av: AvaliacaoFisicaRow, corte100: number | null): Record<string, Valor> {
  const out: Record<string, Valor> = {
    data_avaliacao: av.data,
    idade_avaliacao: a.data_nascimento ? idadeNaData(a.data_nascimento, av.data) : null,
  }
  for (const [col, , , , fator] of TODAS_MEDIDAS) out[col] = valorMedida(av, col, fator)
  const c = classificar(a, av)
  for (const t of TESTES_PROESP) {
    if (TEM_NIVEL.has(t.key)) out[`nivel_${t.key}`] = NIVEL_ROTULO(c[t.key])
    if (TEM_SAUDE.has(t.key)) out[`saude_${t.key}`] = SAUDE_ROTULO(c[t.key])
  }
  const classificados = Object.values(c)
  out.testes_em_risco = classificados.length ? classificados.filter((x) => x.saude === 'risco').length : null
  out.apto_equipe = av.natacao_100m != null && corte100 != null ? av.natacao_100m <= corte100 : null
  const m = maturacaoDe(a, av)
  out.maturacao_offset = m?.offset ?? null
  out.maturacao_classificacao = m?.classificacao ?? null
  out.idade_phv = m?.idadePhv ?? null
  return out
}

/** Visão por atleta: cada teste traz o resultado mais recente daquele teste. */
function dadosAtleta(a: AlunoFonte, avs: AvaliacaoFisicaRow[], corte100: number | null): Record<string, Valor> {
  const out: Record<string, Valor> = {
    ultima_avaliacao: avs[0]?.data ?? null,
    num_avaliacoes: avs.length,
    idade_avaliacao: avs[0] && a.data_nascimento ? idadeNaData(a.data_nascimento, avs[0].data) : null,
  }
  const cache = new Map<string, Record<string, ClassificacaoTeste>>()
  const classifDe = (av: AvaliacaoFisicaRow) => {
    if (!cache.has(av.id)) cache.set(av.id, classificar(a, av))
    return cache.get(av.id)!
  }
  for (const [col, , , , fator] of TODAS_MEDIDAS) {
    const av = avs.find((x) => x[col as keyof AvaliacaoFisicaRow] != null)
    out[col] = av ? valorMedida(av, col, fator) : null
  }
  let classificados = 0, riscos = 0
  for (const t of TESTES_PROESP) {
    const av = avs.find((x) => x[t.key as keyof AvaliacaoFisicaRow] != null)
    const c = av ? classifDe(av)[t.key] : undefined
    if (TEM_NIVEL.has(t.key)) out[`nivel_${t.key}`] = NIVEL_ROTULO(c)
    if (TEM_SAUDE.has(t.key)) out[`saude_${t.key}`] = SAUDE_ROTULO(c)
    if (c) { classificados++; if (c.saude === 'risco') riscos++ }
  }
  out.testes_em_risco = classificados ? riscos : null
  const n100 = out.natacao_100m as number | null
  out.apto_equipe = n100 != null && corte100 != null ? n100 <= corte100 : null
  // Evolução: os dois resultados mais recentes de cada teste (podem vir de dias diferentes).
  for (const [col, , , , fator] of [...TESTES_EVOLUCAO, ...MEDIDAS]) {
    const [atual, anterior] = avs.filter((x) => x[col as keyof AvaliacaoFisicaRow] != null).slice(0, 2)
    const diff = atual && anterior ? arred((valorMedida(atual, col, fator)! - valorMedida(anterior, col, fator)!), 2) : null
    if (MEDIDAS.some(([k]) => k === col)) { out[`var_${col}`] = diff; continue }
    const melhora = diff == null ? null : MENOR_MELHOR.has(col) ? -diff : diff
    out[`melhora_${col}`] = melhora
    out[`tend_${col}`] = melhora == null ? null : melhora > 0 ? 'Melhorou' : melhora < 0 ? 'Piorou' : 'Manteve'
  }
  const [ultima, penultima] = avs
  out.intervalo_avaliacoes = ultima && penultima
    ? Math.round((new Date(`${ultima.data}T12:00:00`).getTime() - new Date(`${penultima.data}T12:00:00`).getTime()) / 86_400_000)
    : null

  let m = null
  for (const av of avs) { m = maturacaoDe(a, av); if (m) break }
  out.maturacao_offset = m?.offset ?? null
  out.maturacao_classificacao = m?.classificacao ?? null
  out.idade_phv = m?.idadePhv ?? null
  return out
}

export function montarLinhas(params: {
  alunos: AlunoFonte[]
  responsaveis: Map<string, Record<string, RespFonte | undefined>>
  fichas: Map<string, FichaFonte[]>
  avaliacoes: Map<string, AvaliacaoFisicaRow[]> // cada lista em ordem de data decrescente
  corte100: number | null
  admin: boolean
  treinos?: Map<string, Record<string, Valor>>   // campos do grupo 'Treinos' por atleta
}): Record<Visao, Linha[]> {
  const semSigilo = (l: Record<string, Valor>) => {
    if (!params.admin) for (const c of CAMPOS) if (c.admin) delete l[c.key]
    return l
  }
  const atleta: Linha[] = []
  const avaliacao: Linha[] = []
  for (const a of params.alunos) {
    const cad = dadosCadastro(a, params.responsaveis.get(a.id) ?? {}, params.fichas.get(a.id) ?? [])
    const avs = params.avaliacoes.get(a.id) ?? []
    atleta.push({ ...semSigilo({ ...cad, ...dadosAtleta(a, avs, params.corte100), ...(params.treinos?.get(a.id) ?? {}) }), _alunoId: a.id })
    for (const av of avs) {
      avaliacao.push({ ...semSigilo({ ...cad, ...dadosAvaliacao(a, av, params.corte100) }), _alunoId: a.id, _avaliacaoId: av.id })
    }
  }
  return { atleta, avaliacao }
}

// ─────────────────────────────── filtros (cliente) ───────────────────────────────

export type Filtro =
  | { campo: string; modo: 'vazio' | 'preenchido' }
  | { campo: string; modo: 'valores'; valores: string[] }   // lista (OU entre os valores)
  | { campo: string; modo: 'faixa'; min?: string; max?: string } // número/data
  | { campo: string; modo: 'sim' | 'nao' }                  // sim/não
  | { campo: string; modo: 'contem'; texto: string }        // texto

export const normalizar = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function mmssParaSegundos(s: string): number | null {
  const m = s.trim().match(/^(\d{1,3}):([0-5]?\d)(?:[.,](\d{1,2}))?$/)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3].padEnd(2, '0')) / 100 : 0)
}

function limiteNumerico(campo: Campo, s?: string): number | null {
  if (!s?.trim()) return null
  if (campo.formato === 'mmss') return mmssParaSegundos(s)
  const v = Number(s.replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

/** Um filtro sem valor preenchido ainda não restringe nada. */
export function filtroAtivo(f: Filtro): boolean {
  if (f.modo === 'valores') return f.valores.length > 0
  if (f.modo === 'faixa') return !!(f.min?.trim() || f.max?.trim())
  if (f.modo === 'contem') return !!f.texto.trim()
  return true
}

export function passa(linha: Linha, f: Filtro, campo: Campo): boolean {
  const v = linha[f.campo]
  const vazio = v == null || v === ''
  switch (f.modo) {
    case 'vazio': return vazio
    case 'preenchido': return !vazio
    case 'sim': return v === true
    case 'nao': return v === false
    case 'valores': return f.valores.length === 0 || (!vazio && f.valores.includes(String(v)))
    case 'contem': return !f.texto.trim() || (!vazio && normalizar(String(v)).includes(normalizar(f.texto)))
    case 'faixa': {
      if (vazio) return !filtroAtivo(f)
      if (campo.tipo === 'data') {
        const s = String(v)
        return (!f.min || s >= f.min) && (!f.max || s <= f.max)
      }
      const min = limiteNumerico(campo, f.min), max = limiteNumerico(campo, f.max)
      return (min == null || Number(v) >= min) && (max == null || Number(v) <= max)
    }
  }
}

export function aplicarFiltros(linhas: Linha[], filtros: Filtro[], campos: Map<string, Campo>): Linha[] {
  const ativos = filtros.filter((f) => campos.has(f.campo) && filtroAtivo(f))
  return linhas.filter((l) => ativos.every((f) => passa(l, f, campos.get(f.campo)!)))
}
