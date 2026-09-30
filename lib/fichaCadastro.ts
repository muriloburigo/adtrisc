// Leva os dados de uma ficha de inscrição preenchida pelos pais para o cadastro
// do atleta (`alunos`) e dos responsáveis (`responsaveis` + `aluno_responsavel`).
//
// A ficha é gerada já com os dados do cadastro (fichas/actions.ts) e os pais
// confirmam ou corrigem — por isso o que eles enviaram vale mais que o cadastro.
// Campo vazio na ficha nunca apaga o que já existe.
//
// O resto da ficha (CPF do atleta, escola, saúde, equipamentos, assinatura) não
// tem coluna em `alunos`: fica na ficha e aparece na página do atleta
// (FichaDadosCard), sempre lido da ficha preenchida mais recente.
//
// Sem 'server-only' de propósito: recebe o client pronto (service role) e é
// usado por server actions e pelo script de recuperação.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
type Linha = Record<string, unknown>

// ficha → alunos
const CAMPOS_ALUNO: [string, string][] = [
  ['p_nome', 'nome'],
  ['p_telefone', 'telefone'],
  ['p_sexo', 'sexo'],
  ['p_data_nascimento', 'data_nascimento'],
  ['p_rua', 'rua'],
  ['p_numero', 'numero'],
  ['p_bairro', 'bairro'],
  ['p_cep', 'cep'],
  ['p_cidade', 'cidade'],
]
const CAMPOS_RESPONSAVEL = ['nome', 'cpf', 'rg', 'email', 'telefone'] as const

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v))

function valorValido(campo: string, v: string): boolean {
  if (!v) return false
  if (campo === 'sexo') return v === 'M' || v === 'F'
  if (campo === 'data_nascimento') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
    const ano = Number(v.slice(0, 4))
    return ano >= 1950 && ano <= new Date().getFullYear()
  }
  return true
}

export type ResultadoFichaCadastro = {
  alunoId: string
  alunoNome: string
  // Só o que mudou. Sem CPF/RG (regra da auditoria).
  aluno: { antes: Linha; depois: Linha }
  responsaveis: { parentesco: 'mae' | 'pai'; acao: 'criado' | 'atualizado'; nome: string }[]
}

// `simular`: calcula o que mudaria sem gravar nada (usado para revisar antes).
export async function aplicarFichaNoCadastro(db: Db, fichaId: string, { simular = false } = {}): Promise<{ error?: string; resultado?: ResultadoFichaCadastro }> {
  const { data: ficha } = await db.from('fichas_inscricao').select('*').eq('id', fichaId).single()
  if (!ficha) return { error: 'Ficha não encontrada.' }
  if (ficha.status !== 'preenchida') return { error: 'A ficha ainda não foi preenchida.' }
  if (!ficha.aluno_id) return { error: 'Ficha sem atleta vinculado.' }

  const { data: aluno } = await db.from('alunos').select('*').eq('id', ficha.aluno_id).single()
  if (!aluno) return { error: 'Atleta não encontrado.' }

  // ── Atleta ──
  const antes: Linha = {}
  const depois: Linha = {}
  for (const [deFicha, campo] of CAMPOS_ALUNO) {
    const novo = texto(ficha[deFicha])
    if (!valorValido(campo, novo) || novo === texto(aluno[campo])) continue
    antes[campo] = aluno[campo] ?? null
    depois[campo] = novo
  }
  if (!simular && Object.keys(depois).length > 0) {
    const { error } = await db.from('alunos').update(depois).eq('id', aluno.id)
    if (error) return { error: `Erro ao atualizar o atleta: ${error.message}` }
  }

  // ── Responsáveis (mãe e pai) ──
  const responsaveis: ResultadoFichaCadastro['responsaveis'] = []
  const { data: links } = await db
    .from('aluno_responsavel')
    .select('responsavel_id, responsaveis(*)')
    .eq('aluno_id', aluno.id)

  for (const parentesco of ['mae', 'pai'] as const) {
    const dados: Linha = {}
    for (const c of CAMPOS_RESPONSAVEL) {
      const v = texto(ficha[`${parentesco}_${c}`])
      if (v) dados[c] = v
    }
    if (!dados.nome) continue

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link = (links ?? []).find((l: any) => l.responsaveis?.parentesco === parentesco)
    if (link) {
      const atual = link.responsaveis as Linha
      const mudou = Object.fromEntries(Object.entries(dados).filter(([k, v]) => texto(atual[k]) !== v))
      if (Object.keys(mudou).length === 0) continue
      if (simular) { responsaveis.push({ parentesco, acao: 'atualizado', nome: String(dados.nome) }); continue }
      const { error } = await db.from('responsaveis').update(mudou).eq('id', link.responsavel_id)
      if (error) return { error: `Erro ao atualizar responsável: ${error.message}` }
      responsaveis.push({ parentesco, acao: 'atualizado', nome: String(dados.nome) })
    } else {
      if (simular) { responsaveis.push({ parentesco, acao: 'criado', nome: String(dados.nome) }); continue }
      const { data: novo, error } = await db
        .from('responsaveis').insert({ ...dados, parentesco }).select('id').single()
      if (error || !novo) return { error: `Erro ao criar responsável: ${error?.message ?? ''}` }
      await db.from('aluno_responsavel').insert({ aluno_id: aluno.id, responsavel_id: novo.id, principal: parentesco === 'mae' })
      responsaveis.push({ parentesco, acao: 'criado', nome: String(dados.nome) })
    }
  }

  return {
    resultado: {
      alunoId: aluno.id,
      alunoNome: String(depois.nome ?? aluno.nome),
      aluno: { antes, depois },
      responsaveis,
    },
  }
}

export const houveMudanca = (r: ResultadoFichaCadastro) =>
  Object.keys(r.aluno.depois).length > 0 || r.responsaveis.length > 0
