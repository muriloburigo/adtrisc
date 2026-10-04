import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarRange, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import CalendarioTreinos, { type SessaoCalendario } from '@/components/treinos/CalendarioTreinos'
import PainelLimiares from '@/components/treinos/PainelLimiares'
import { getTurmasDoCoach } from '@/lib/turmas'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import { referenciasDosAtletas } from '@/lib/treinos/referencia'
import { diasDaSemana, hojeISO, semanasDoMes } from '@/lib/treinos/datas'
import type { Passo } from '@/lib/treinos/tipos'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Calendário de treinos (porte do calendário do Movelly). Escopo: uma turma com
// o módulo ligado (treino da turma) ou um atleta dela (treino da turma + ajustes
// + individuais). Rascunhos só o staff vê; publicar libera para o atleta.
export default async function TreinosPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const db = (await createClient()) as Db
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await db.from('profiles').select('role').eq('id', user.id).single()
  if (!perfil || !['admin', 'coach'].includes(perfil.role)) redirect('/dashboard')

  // Turmas com o módulo ligado que o usuário pode acessar (titular ou auxiliar).
  const minhas = perfil.role === 'admin' ? null : new Set((await getTurmasDoCoach(db, user.id)).map((t) => t.id))
  const { data: turmasRaw } = await db.from('turmas').select('id, nome').eq('usa_treinos', true).eq('status', 'ativa').order('nome')
  const turmas = ((turmasRaw ?? []) as { id: string; nome: string }[]).filter((t) => !minhas || minhas.has(t.id))
  const turmaIds = turmas.map((t) => t.id)
  const { data: alunosRaw } = await db.from('alunos').select('id, nome, turma_id')
    .in('turma_id', turmaIds.length ? turmaIds : ['00000000-0000-0000-0000-000000000000']).eq('status', 'ativo').order('nome')
  const alunos = (alunosRaw ?? []) as { id: string; nome: string; turma_id: string }[]

  const aluno = sp.aluno ? alunos.find((a) => a.id === sp.aluno) : undefined
  const turma = turmas.find((t) => t.id === (aluno?.turma_id ?? sp.turma))

  if (!turma) {
    return (
      <div className="p-4 sm:p-8">
        <PageHeader title="Treinos" subtitle="Escolha a turma para planejar os treinos"
          action={<Link href="/treinos/biblioteca" className="text-sm text-sky-500 hover:underline">Biblioteca de treinos</Link>} />
        {turmas.length === 0 ? (
          <Card><EmptyState icon={CalendarRange} title="Nenhuma turma com o módulo de treinos"
            description="Ligue “Esta turma usa o módulo de treinos” no cadastro da turma." /></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {turmas.map((t) => (
              <Link key={t.id} href={`/treinos?turma=${t.id}`} className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-sky-400 transition-colors">
                <p className="font-semibold text-navy-500">{t.nome}</p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Users size={12} /> {alunos.filter((a) => a.turma_id === t.id).length} atletas</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  const vista = sp.vista === 'mes' ? 'mes' : 'semana'
  const ancora = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? '') ? sp.data! : hojeISO()
  const semanas = vista === 'mes' ? semanasDoMes(ancora) : [diasDaSemana(ancora)]
  const de = semanas[0][0], ate = semanas[semanas.length - 1][6]
  const atletasTurma = alunos.filter((a) => a.turma_id === turma.id)

  // Sessões da turma no período + ajustes/individuais (dos atletas da turma, ou do atleta).
  const doEscopo = aluno ? [aluno.id] : atletasTurma.map((a) => a.id)
  const sel = '*, treino_passos(*)'
  const [{ data: daTurma }, { data: dosAtletas }, config, refs, { data: pastasRaw }, { data: modelosRaw }] = await Promise.all([
    db.from('treino_sessoes').select(sel).eq('turma_id', turma.id).gte('data', de).lte('data', ate),
    db.from('treino_sessoes').select(sel).in('aluno_id', doEscopo.length ? doEscopo : ['00000000-0000-0000-0000-000000000000']).gte('data', de).lte('data', ate),
    getConfigAvaliacao(db),
    referenciasDosAtletas(db, aluno ? [aluno.id] : atletasTurma.map((a) => a.id)),
    db.from('treino_pastas').select('id, nome').order('ordem'),
    db.from('treino_modelos').select('id, titulo, modalidade, tipo, duracao_min, distancia_km, pasta_id').order('titulo'),
  ])
  type Row = Omit<SessaoCalendario, 'passos' | 'origem' | 'nAjustes'> & { treino_passos: Passo[] }
  const individuais = (dosAtletas ?? []) as Row[]
  const ajustesPorSessao: Record<string, Record<string, string>> = {}
  for (const s of individuais) {
    if (s.sessao_origem_id) (ajustesPorSessao[s.sessao_origem_id] ??= {})[s.aluno_id!] = s.id
  }
  const montar = (s: Row, origem: SessaoCalendario['origem']): SessaoCalendario => {
    const { treino_passos, ...resto } = s
    return { ...resto, passos: [...(treino_passos ?? [])].sort((a, b) => a.ordem - b.ordem), origem, nAjustes: Object.keys(ajustesPorSessao[s.id] ?? {}).length }
  }
  const sessoes: SessaoCalendario[] = aluno
    // Atleta: o ajuste substitui o treino da turma de origem.
    ? [
      ...((daTurma ?? []) as Row[]).filter((s) => !ajustesPorSessao[s.id]?.[aluno.id]).map((s) => montar(s, 'turma')),
      ...individuais.map((s) => montar(s, s.sessao_origem_id ? 'ajuste' : 'individual')),
    ]
    : [
      ...((daTurma ?? []) as Row[]).map((s) => montar(s, 'turma')),
      ...individuais.map((s) => montar(s, s.sessao_origem_id ? 'ajuste' : 'individual')),
    ]
  sessoes.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem))

  // Entregas (situação + envio ao Intervals) por sessão e atleta, e quem está conectado.
  const entregasPorSessao: Record<string, Record<string, { situacao: string; enviado: boolean; erro: string | null }>> = {}
  const [{ data: entsTodas }, { data: conectadosRaw }] = await Promise.all([
    sessoes.length ? db.from('treino_entregas').select('sessao_id, aluno_id, situacao, intervals_event_id, erro_envio').in('sessao_id', sessoes.map((s) => s.id)) : Promise.resolve({ data: [] }),
    db.from('intervals_conexoes').select('aluno_id').in('aluno_id', doEscopo.length ? doEscopo : ['00000000-0000-0000-0000-000000000000']),
  ])
  for (const e of (entsTodas ?? []) as { sessao_id: string; aluno_id: string; situacao: string; intervals_event_id: string | null; erro_envio: string | null }[]) {
    (entregasPorSessao[e.sessao_id] ??= {})[e.aluno_id] = { situacao: e.situacao, enviado: Boolean(e.intervals_event_id), erro: e.erro_envio }
  }
  const conectados = new Set(((conectadosRaw ?? []) as { aluno_id: string }[]).map((c) => c.aluno_id))

  // Visão do atleta: o que ele marcou no portal (feito / não feito + comentário).
  if (aluno && sessoes.length) {
    const { data: ents } = await db.from('treino_entregas').select('sessao_id, situacao, observacao_atleta').eq('aluno_id', aluno.id).in('sessao_id', sessoes.map((s) => s.id))
    const porSessao = new Map(((ents ?? []) as { sessao_id: string; situacao: string; observacao_atleta: string | null }[]).map((e) => [e.sessao_id, e]))
    for (const s of sessoes) {
      const e = porSessao.get(s.id)
      if (e) { s.situacao = e.situacao as SessaoCalendario['situacao']; s.obsAtleta = e.observacao_atleta }
    }
  }

  const atletas = (aluno ? [aluno] : atletasTurma).map((a) => {
    const r = refs.get(a.id)!
    return { id: a.id, nome: a.nome, referencias: { running: r.running, cycling: r.cycling, swimming: r.swimming }, fcMax: r.fcMax, intervals: conectados.has(a.id) }
  })

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <PageHeader
        title={aluno ? aluno.nome : turma.nome}
        subtitle={aluno ? `Treinos do atleta · ${turma.nome}` : 'Treinos da turma'}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-400">Ver:</span>
        <Link href={`/treinos?turma=${turma.id}&vista=${vista}&data=${ancora}`}
          className={`px-3 py-1.5 rounded-lg font-medium ${!aluno ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>Turma inteira</Link>
        <form className="contents" action="/treinos">
          <input type="hidden" name="vista" value={vista} />
          <input type="hidden" name="data" value={ancora} />
          <select name="aluno" defaultValue={aluno?.id ?? ''} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="" disabled>Um atleta…</option>
            {atletasTurma.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
          <button className="text-sm text-sky-500 hover:underline">abrir</button>
        </form>
        <Link href={`/treinos/planos?${aluno ? `aluno=${aluno.id}` : `turma=${turma.id}`}`} className="ml-auto text-xs font-medium text-sky-500 hover:underline">planos</Link>
        <Link href="/treinos/biblioteca" className="text-xs text-gray-400 hover:text-navy-500">gerenciar biblioteca</Link>
        <Link href="/treinos" className="text-xs text-gray-400 hover:text-navy-500">trocar turma</Link>
      </div>

      <CalendarioTreinos
        escopo={aluno ? { tipo: 'aluno', id: aluno.id, nome: aluno.nome } : { tipo: 'turma', id: turma.id, nome: turma.nome }}
        vista={vista}
        ancora={ancora}
        semanas={semanas}
        sessoes={sessoes}
        atletas={atletas}
        ajustesPorSessao={ajustesPorSessao}
        limites={config.zona_limites}
        biblioteca={{ pastas: pastasRaw ?? [], modelos: modelosRaw ?? [] }}
        entregasPorSessao={entregasPorSessao}
      />

      {aluno && (() => {
        const r = refs.get(aluno.id)!
        return <PainelLimiares alunoId={aluno.id} referencias={{ running: r.running, cycling: r.cycling, swimming: r.swimming }} limiares={r.limiares} limites={config.zona_limites} />
      })()}
    </div>
  )
}
