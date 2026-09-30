import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PageHeader from '@/components/layout/PageHeader'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import { montarLinhas, camposVisiveis, type AlunoFonte, type RespFonte, type FichaFonte } from '@/lib/relatorio'
import type { AvaliacaoFisicaRow } from '@/types/database'
import RelatorioAtletas from './RelatorioAtletas'

// Relatório de atletas com filtros combinados (cadastro, responsáveis, ficha e
// avaliações). Sem exportação: os resultados aparecem na tela conforme os
// filtros mudam. O treinador só vê as turmas dele (RLS); CPF/RG só para admin.
export default async function RelatoriosPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!perfil || !['admin', 'coach'].includes(perfil.role)) redirect('/dashboard')
  const admin = perfil.role === 'admin'

  // Atletas pelo client normal: a RLS limita o treinador às turmas dele.
  const [{ data: alunosRaw }, config] = await Promise.all([
    supabase.from('alunos')
      .select('id, nome, sexo, data_nascimento, status, telefone, rua, numero, bairro, cidade, cep, observacoes, created_at, turmas:turma_id ( nome )')
      .order('nome'),
    getConfigAvaliacao(supabase),
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alunos: AlunoFonte[] = ((alunosRaw ?? []) as any[]).map((a) => ({ ...a, turma: a.turmas?.nome ?? null }))
  const ids = alunos.length ? alunos.map((a) => a.id) : ['00000000-0000-0000-0000-000000000000']

  // Responsáveis e fichas não têm policy própria: service role, mas só dos
  // atletas que este usuário já pode ver (lista acima).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminDb = createAdminClient() as any
  const [{ data: respsRaw }, { data: fichasRaw }, { data: avsRaw }] = await Promise.all([
    adminDb.from('aluno_responsavel').select('aluno_id, responsaveis ( nome, telefone, email, cpf, rg, parentesco )').in('aluno_id', ids),
    adminDb.from('fichas_inscricao').select('*').in('aluno_id', ids).order('created_at', { ascending: false }),
    supabase.from('avaliacoes_fisicas').select('*').in('aluno_id', ids).is('deleted_at', null).order('data', { ascending: false }),
  ])

  const responsaveis = new Map<string, Record<string, RespFonte>>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (respsRaw ?? []) as any[]) {
    const p = r.responsaveis?.parentesco
    if (p !== 'mae' && p !== 'pai') continue
    const m = responsaveis.get(r.aluno_id) ?? {}
    m[p] ??= r.responsaveis
    responsaveis.set(r.aluno_id, m)
  }
  const fichas = new Map<string, FichaFonte[]>()
  for (const f of (fichasRaw ?? []) as FichaFonte[]) {
    const id = f.aluno_id as string
    fichas.set(id, [...(fichas.get(id) ?? []), f])
  }
  const avaliacoes = new Map<string, AvaliacaoFisicaRow[]>()
  for (const av of (avsRaw ?? []) as AvaliacaoFisicaRow[]) {
    avaliacoes.set(av.aluno_id, [...(avaliacoes.get(av.aluno_id) ?? []), av])
  }

  const linhas = montarLinhas({ alunos, responsaveis, fichas, avaliacoes, corte100: config.natacao_100m_corte_s, admin })

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Relatórios"
        subtitle={admin ? 'Todos os atletas' : 'Atletas das suas turmas'}
      />
      <RelatorioAtletas
        linhasRecentes={linhas.atleta}
        linhasAvaliacoes={linhas.avaliacao}
        campos={camposVisiveis('atleta', admin).concat(camposVisiveis('avaliacao', admin).filter((c) => c.visao === 'avaliacao'))}
      />
    </div>
  )
}
