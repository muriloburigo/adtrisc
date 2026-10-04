import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { cifrar, decifrar } from '@/lib/crypto'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import { referenciasDosAtletas, referenciaDe } from '@/lib/treinos/referencia'
import { eventoIntervals } from '@/lib/treinos/textoIntervals'
import { hojeISO, somarDias } from '@/lib/treinos/datas'
import type { Modalidade, Passo } from '@/lib/treinos/tipos'
import * as api from './client'
import { escolherTreino, mapearAtividade } from './atividade'

// Sincronização com o Intervals.icu — porte de IntervalsSessionSyncService,
// SyncIntervalsActivitiesJob e ProcessIntervalsActivityAction do Movelly.
// O treino da turma vira UM evento por atleta conectado, com o pace DELE
// (o texto do treino muda de atleta para atleta). Roda com o service role,
// normalmente dentro de after() — nunca lança: erros ficam em treino_entregas
// (erro_envio) e em intervals_conexoes (ultimo_erro).

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
type Conexao = { aluno_id: string; atleta: string; token: string }

export async function salvarConexao(alunoId: string, intervalsAthleteId: string, token: string, escopo: string | null) {
  const db = createAdminClient() as Db
  const { error } = await db.from('intervals_conexoes').upsert({
    aluno_id: alunoId, intervals_athlete_id: intervalsAthleteId, token_cifrado: cifrar(token), escopo,
    conectado_em: new Date().toISOString(), ultima_sincronizacao: null, ultimo_erro: null,
  }, { onConflict: 'aluno_id' })
  return error
}

async function conexoes(db: Db, alunoIds: string[]): Promise<Map<string, Conexao>> {
  const m = new Map<string, Conexao>()
  if (!alunoIds.length) return m
  const { data } = await db.from('intervals_conexoes').select('aluno_id, intervals_athlete_id, token_cifrado').in('aluno_id', alunoIds)
  for (const c of (data ?? []) as { aluno_id: string; intervals_athlete_id: string; token_cifrado: string }[]) {
    try { m.set(c.aluno_id, { aluno_id: c.aluno_id, atleta: c.intervals_athlete_id, token: decifrar(c.token_cifrado) }) } catch (e) { console.error('[intervals] token ilegível', c.aluno_id, e) }
  }
  return m
}

/** Atletas que recebem esta sessão: o dono (individual/ajuste) ou os ativos da turma sem ajuste. */
async function destinatarios(db: Db, s: { id: string; turma_id: string | null; aluno_id: string | null }): Promise<string[]> {
  if (s.aluno_id) return [s.aluno_id]
  const [{ data: alunos }, { data: ajustes }] = await Promise.all([
    db.from('alunos').select('id').eq('turma_id', s.turma_id).eq('status', 'ativo'),
    db.from('treino_sessoes').select('aluno_id').eq('sessao_origem_id', s.id).eq('status', 'publicado'),
  ])
  const comAjuste = new Set(((ajustes ?? []) as { aluno_id: string }[]).map((a) => a.aluno_id))
  return ((alunos ?? []) as { id: string }[]).map((a) => a.id).filter((id) => !comAjuste.has(id))
}

async function emLotes<T>(itens: T[], n: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < itens.length; i += n) await Promise.all(itens.slice(i, i + n).map(fn))
}

/**
 * Deixa o Intervals de cada atleta igual à sessão: cria/atualiza o evento de
 * quem deve recebê-la e apaga o de quem não deve mais (ajuste novo, sessão
 * despublicada, atleta saiu da turma). `soAluno` limita a um atleta.
 */
export async function sincronizarSessao(sessaoId: string, soAluno?: string): Promise<void> {
  const db = createAdminClient() as Db
  try {
    const { data: s } = await db.from('treino_sessoes').select('id, turma_id, aluno_id, data, titulo, modalidade, notas, status, treino_passos(*)').eq('id', sessaoId).maybeSingle()
    const { data: ents } = await db.from('treino_entregas').select('aluno_id, intervals_event_id').eq('sessao_id', sessaoId)
    const existentes = new Map(((ents ?? []) as { aluno_id: string; intervals_event_id: string | null }[]).map((e) => [e.aluno_id, e.intervals_event_id]))
    let quem = s && s.status === 'publicado' ? await destinatarios(db, s) : []
    if (soAluno) quem = quem.filter((a) => a === soAluno)
    const alvo = new Set(quem)
    const conex = await conexoes(db, [...new Set([...quem, ...existentes.keys()])].filter((a) => !soAluno || a === soAluno))

    // Apaga eventos de quem não deve mais ter esta sessão.
    for (const [aluno, evento] of existentes) {
      if (!evento || alvo.has(aluno) || (soAluno && aluno !== soAluno)) continue
      const c = conex.get(aluno)
      if (c) await api.apagarEvento(c.token, c.atleta, evento)
      await db.from('treino_entregas').update({ intervals_event_id: null, enviado_em: null, erro_envio: null }).eq('sessao_id', sessaoId).eq('aluno_id', aluno)
    }
    if (!s || !quem.length) return

    const conectados = quem.filter((a) => conex.has(a))
    if (!conectados.length) return
    const [refs, config] = await Promise.all([referenciasDosAtletas(db, conectados), getConfigAvaliacao(db)])
    const passos = [...((s.treino_passos ?? []) as Passo[])].sort((a, b) => a.ordem - b.ordem)
    await emLotes(conectados, 4, async (aluno) => {
      const c = conex.get(aluno)!
      const r = refs.get(aluno)
      const evento = eventoIntervals({ ...s, passos }, { referencia: referenciaDe(r, s.modalidade as Modalidade), limites: config.zona_limites, fcMax: r?.fcMax })
      const atual = existentes.get(aluno)
      let res = atual ? await api.atualizarEvento(c.token, c.atleta, atual, evento) : await api.criarEvento(c.token, c.atleta, evento)
      if (atual && !res.ok && res.status === 404) res = await api.criarEvento(c.token, c.atleta, evento) // apagado lá
      await db.from('treino_entregas').upsert({
        sessao_id: sessaoId, aluno_id: aluno,
        ...(res.ok ? { intervals_event_id: String(res.data?.id ?? atual ?? ''), enviado_em: new Date().toISOString(), erro_envio: null } : { erro_envio: res.error }),
      }, { onConflict: 'sessao_id,aluno_id' })
    })
  } catch (e) {
    console.error('[intervals] sincronizarSessao', sessaoId, e)
  }
}

/** Antes de apagar sessões: tira os eventos do Intervals (as entregas somem em cascata). */
export async function removerEventos(sessaoIds: string[]): Promise<void> {
  if (!sessaoIds.length) return
  const db = createAdminClient() as Db
  try {
    const { data: aj } = await db.from('treino_sessoes').select('id').in('sessao_origem_id', sessaoIds)
    const ids = [...sessaoIds, ...((aj ?? []) as { id: string }[]).map((a) => a.id)]
    const { data: ents } = await db.from('treino_entregas').select('aluno_id, intervals_event_id').in('sessao_id', ids).not('intervals_event_id', 'is', null)
    const lista = (ents ?? []) as { aluno_id: string; intervals_event_id: string }[]
    const conex = await conexoes(db, [...new Set(lista.map((e) => e.aluno_id))])
    await emLotes(lista, 4, async (e) => {
      const c = conex.get(e.aluno_id)
      if (c) await api.apagarEvento(c.token, c.atleta, e.intervals_event_id)
    })
  } catch (e) {
    console.error('[intervals] removerEventos', e)
  }
}

/** Sessões publicadas do atleta (turma sem as substituídas por ajuste + as dele) entre duas datas. */
async function sessoesDoAtleta(db: Db, aluno: { id: string; turma_id: string | null }, de: string, ate: string) {
  const sel = 'id, data, modalidade, distancia_km, sessao_origem_id'
  const [{ data: turma }, { data: dele }] = await Promise.all([
    aluno.turma_id ? db.from('treino_sessoes').select(sel).eq('turma_id', aluno.turma_id).eq('status', 'publicado').gte('data', de).lte('data', ate) : Promise.resolve({ data: [] }),
    db.from('treino_sessoes').select(sel).eq('aluno_id', aluno.id).eq('status', 'publicado').gte('data', de).lte('data', ate),
  ])
  type S = { id: string; data: string; modalidade: Modalidade; distancia_km: number | null; sessao_origem_id: string | null }
  const proprias = (dele ?? []) as S[]
  const substituidas = new Set(proprias.map((s) => s.sessao_origem_id))
  return [...((turma ?? []) as S[]).filter((s) => !substituidas.has(s.id)), ...proprias]
}

/** Depois de conectar: manda os treinos publicados de hoje em diante. */
export async function enviarFuturos(alunoId: string): Promise<void> {
  const db = createAdminClient() as Db
  const { data: a } = await db.from('alunos').select('id, turma_id').eq('id', alunoId).maybeSingle()
  if (!a) return
  const sessoes = await sessoesDoAtleta(db, a, hojeISO(), somarDias(hojeISO(), 120))
  for (const s of sessoes) await sincronizarSessao(s.id, alunoId)
}

/**
 * Importa as atividades dos últimos `dias` e casa com os treinos (mesmo dia e
 * modalidade; havendo dois, a distância mais próxima). Sem treino → extra.
 */
export async function importarAtividades(alunoId: string, dias = 3): Promise<{ novas: number; erro?: string }> {
  const db = createAdminClient() as Db
  const c = (await conexoes(db, [alunoId])).get(alunoId)
  if (!c) return { novas: 0, erro: 'Atleta sem Intervals conectado.' }
  const de = somarDias(hojeISO(), -dias), ate = hojeISO()
  const r = await api.atividades(c.token, c.atleta, de, ate)
  if (!r.ok) {
    await db.from('intervals_conexoes').update({ ultimo_erro: r.error }).eq('aluno_id', alunoId)
    return { novas: 0, erro: r.error }
  }
  const { data: a } = await db.from('alunos').select('id, turma_id').eq('id', alunoId).maybeSingle()
  const mapeadas = (r.data ?? []).map((x) => mapearAtividade(x, de)).filter((x): x is NonNullable<typeof x> => Boolean(x))
  const { data: jaTem } = await db.from('treino_execucoes').select('atividade_externa_id').eq('aluno_id', alunoId).eq('origem', 'intervals')
  const conhecidas = new Set(((jaTem ?? []) as { atividade_externa_id: string }[]).map((x) => x.atividade_externa_id))
  const sessoes = a ? await sessoesDoAtleta(db, a, de, ate) : []
  // Sessões que já têm uma execução vinculada não recebem outra.
  const { data: usadas } = await db.from('treino_execucoes').select('treino_entregas!inner(sessao_id)').eq('aluno_id', alunoId).not('entrega_id', 'is', null)
  const ocupadas = new Set(((usadas ?? []) as { treino_entregas: { sessao_id: string } }[]).map((u) => u.treino_entregas.sessao_id))

  let novas = 0
  for (const at of mapeadas.sort((x, y) => x.executado_em.localeCompare(y.executado_em))) {
    if (conhecidas.has(at.id)) continue
    const treino = escolherTreino(sessoes.filter((s) => s.data === at.data && !ocupadas.has(s.id)), at)
    let entregaId: string | null = null
    if (treino) {
      ocupadas.add(treino.id)
      const { data: ent } = await db.from('treino_entregas').select('id, situacao').eq('sessao_id', treino.id).eq('aluno_id', alunoId).maybeSingle()
      if (ent) {
        entregaId = ent.id
        if (ent.situacao === 'planejado') await db.from('treino_entregas').update({ situacao: 'feito', marcado_por: 'auto', marcado_em: new Date().toISOString() }).eq('id', ent.id)
      } else {
        const { data: nova } = await db.from('treino_entregas').insert({ sessao_id: treino.id, aluno_id: alunoId, situacao: 'feito', marcado_por: 'auto', marcado_em: new Date().toISOString() }).select('id').single()
        entregaId = nova?.id ?? null
      }
    }
    const { error } = await db.from('treino_execucoes').insert({
      entrega_id: entregaId, aluno_id: alunoId, origem: 'intervals', atividade_externa_id: at.id, modalidade: at.modalidade, titulo: at.titulo,
      executado_em: `${at.executado_em}-03:00`, duracao_s: at.duracao_s, distancia_m: at.distancia_m, fc_media: at.fc_media, fc_max: at.fc_max,
      pace_medio_s_km: at.pace_medio_s_km, velocidade_media_ms: at.velocidade_media_ms, cadencia_media: at.cadencia_media, elevacao_m: at.elevacao_m,
      potencia_media_w: at.potencia_media_w, calorias: at.calorias, tss: at.tss, zonas: at.zonas, dados: { tipo: at.tipo },
    })
    if (!error) { novas++; conhecidas.add(at.id) } else console.error('[intervals] execução', at.id, error.message)
  }
  await db.from('intervals_conexoes').update({ ultima_sincronizacao: new Date().toISOString(), ultimo_erro: null }).eq('aluno_id', alunoId)
  return { novas }
}

/** ACTIVITY_DELETED: tira a execução; se o "feito" tinha sido automático, volta a planejado. */
export async function removerAtividade(intervalsAthleteId: string, atividadeId: string): Promise<void> {
  const db = createAdminClient() as Db
  const { data: cs } = await db.from('intervals_conexoes').select('aluno_id').eq('intervals_athlete_id', intervalsAthleteId)
  for (const { aluno_id } of (cs ?? []) as { aluno_id: string }[]) {
    const { data: ex } = await db.from('treino_execucoes').delete().eq('aluno_id', aluno_id).eq('origem', 'intervals').eq('atividade_externa_id', atividadeId).select('entrega_id')
    for (const e of (ex ?? []) as { entrega_id: string | null }[]) {
      if (e.entrega_id) await db.from('treino_entregas').update({ situacao: 'planejado', marcado_por: null, marcado_em: null }).eq('id', e.entrega_id).eq('marcado_por', 'auto')
    }
  }
}

/** Alunos conectados a um atleta do Intervals (o mesmo atleta pode, em tese, estar em mais de um cadastro). */
export async function alunosDoAtletaIcu(intervalsAthleteId: string): Promise<string[]> {
  const db = createAdminClient() as Db
  const { data } = await db.from('intervals_conexoes').select('aluno_id').eq('intervals_athlete_id', intervalsAthleteId)
  return ((data ?? []) as { aluno_id: string }[]).map((c) => c.aluno_id)
}

export async function apagarConexao(alunoId: string, revogarLa = true): Promise<void> {
  const db = createAdminClient() as Db
  if (revogarLa) {
    const c = (await conexoes(db, [alunoId])).get(alunoId)
    if (c) await api.desconectarApp(c.token)
  }
  await db.from('intervals_conexoes').delete().eq('aluno_id', alunoId)
  await db.from('treino_entregas').update({ intervals_event_id: null, enviado_em: null, erro_envio: null }).eq('aluno_id', alunoId)
}
