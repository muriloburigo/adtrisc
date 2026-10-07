'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { removerAntesDeApagar, sincronizarDepois } from '@/lib/intervals/gatilhos'
import { friendlyError } from '@/lib/errors'
import { calcularCarga, metricasPlanejadas, normalizarPassos, referenciaPadrao, validarSessao } from '@/lib/treinos/calculos'
import { MODALIDADES, TIPOS_SESSAO, type Modalidade, type Passo, type TipoSessao } from '@/lib/treinos/tipos'

// Escritas pelo client normal: a RLS (treino_staff_pode → coach_has_turma /
// coach_has_aluno, titular = auxiliar) decide o que cada um pode tocar.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type SessaoForm = {
  id?: string
  turma_id?: string | null
  aluno_id?: string | null
  sessao_origem_id?: string | null
  data: string
  titulo: string
  tipo: TipoSessao
  modalidade: Modalidade
  local?: string | null
  chave?: boolean
  notas?: string | null
  intensidade_tipo?: string | null
  intensidade_alvo?: string | null
  passos: Partial<Passo>[]
  publicar?: boolean
  ordem?: number      // só na criação; sem ela, o treino vai para o fim do dia
  oculto?: boolean    // oculto: atleta não vê, não vai ao Intervals (como no Movelly)
}

const limpa = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim() || null

function revalidar() {
  revalidatePath('/treinos', 'layout')
  revalidatePath('/portal', 'layout')
}

/** Turma/atleta com o módulo ligado (checkbox da turma). */
async function moduloLigado(db: Db, turmaId: string | null | undefined, alunoId: string | null | undefined) {
  let id = turmaId
  if (!id && alunoId) {
    const { data } = await db.from('alunos').select('turma_id').eq('id', alunoId).maybeSingle()
    id = data?.turma_id
  }
  if (!id) return false
  const { data: t } = await db.from('turmas').select('usa_treinos').eq('id', id).maybeSingle()
  return Boolean(t?.usa_treinos)
}

export async function salvarSessao(f: SessaoForm): Promise<{ error?: string; id?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db

  if (!f.turma_id && !f.aluno_id) return { error: 'Escolha a turma ou o atleta.' }
  if (!(f.tipo in TIPOS_SESSAO) || !(f.modalidade in MODALIDADES)) return { error: 'Tipo ou modalidade inválidos.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.data)) return { error: 'Data inválida.' }
  if (!(await moduloLigado(db, f.turma_id, f.aluno_id))) return { error: 'O módulo de treinos não está ligado para esta turma.' }

  const passos = normalizarPassos(f.passos)
  const erros = validarSessao({ titulo: f.titulo, data: f.data, passos })
  if (erros.length) return { error: erros[0] }

  // Duração/distância/carga planejadas com a referência padrão (o pace de cada
  // atleta é calculado na hora de mostrar/enviar).
  const m = metricasPlanejadas(passos, referenciaPadrao(f.modalidade))
  const duracao_min = m.duracao_s ? Math.ceil(m.duracao_s / 60) : null
  const dados = {
    turma_id: f.turma_id ?? null,
    aluno_id: f.aluno_id ?? null,
    sessao_origem_id: f.sessao_origem_id ?? null,
    data: f.data,
    titulo: limpa(f.titulo)!.slice(0, 120),
    tipo: f.tipo,
    modalidade: f.modalidade,
    duracao_min,
    distancia_km: f.modalidade === 'strength' ? null : m.distancia_km,
    carga: calcularCarga({ duracao_min, distancia_km: m.distancia_km, tipo: f.tipo, intensidade_tipo: f.intensidade_tipo, intensidade_alvo: f.intensidade_alvo }),
    intensidade_tipo: f.intensidade_tipo ?? null,
    intensidade_alvo: limpa(f.intensidade_alvo),
    local: limpa(f.local),
    chave: Boolean(f.chave),
    oculto: Boolean(f.oculto),
    notas: limpa(f.notas),
    updated_at: new Date().toISOString(),
    ...(f.publicar ? { status: 'publicado', publicado_em: new Date().toISOString() } : {}),
  }

  let id = f.id
  if (id) {
    const { error } = await db.from('treino_sessoes').update(dados).eq('id', id)
    if (error) return { error: friendlyError(error, 'Erro ao salvar o treino.') }
    const { error: e2 } = await db.from('treino_passos').delete().eq('sessao_id', id)
    if (e2) return { error: friendlyError(e2, 'Erro ao salvar os blocos.') }
  } else {
    let ordem = f.ordem
    if (ordem == null) {
      let q = db.from('treino_sessoes').select('ordem').eq('data', f.data).is('sessao_origem_id', null).order('ordem', { ascending: false }).limit(1)
      q = dados.turma_id ? q.eq('turma_id', dados.turma_id) : q.eq('aluno_id', dados.aluno_id)
      const { data: ult } = await q
      ordem = (ult?.[0]?.ordem ?? 0) + 1
    }
    const { data, error } = await db.from('treino_sessoes').insert({ ...dados, ordem, criado_por: actor.id }).select('id').single()
    if (error || !data) return { error: friendlyError(error, 'Erro ao criar o treino.') }
    id = data.id
  }
  if (passos.length) {
    const { error } = await db.from('treino_passos').insert(passos.map(({ id: _id, ...p }) => ({ ...p, sessao_id: id }))) // eslint-disable-line @typescript-eslint/no-unused-vars
    if (error) return { error: friendlyError(error, 'Erro ao salvar os blocos.') }
  }

  await logAudit({
    userId: actor.id, userName: actor.name,
    action: f.id ? 'editar' : 'criar', resource: 'treino',
    resourceId: id!, resourceLabel: `${dados.titulo} — ${f.data}`,
    after: { ...dados, passos: passos.length },
  })
  sincronizarDepois([id])   // só age se a sessão estiver publicada (ou deixou de estar)
  revalidar()
  return { id }
}

export async function apagarSessao(id: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const { data: antes } = await db.from('treino_sessoes').select('sessao_origem_id').eq('id', id).maybeSingle()
  if (!antes) return { error: 'Treino não encontrado.' }
  await removerAntesDeApagar([id])
  const { data, error } = await db.from('treino_sessoes').delete().eq('id', id).select('titulo, data').maybeSingle()
  if (error) return { error: friendlyError(error, 'Erro ao apagar o treino.') }
  if (!data) return { error: 'Treino não encontrado.' }
  await logAudit({
    userId: actor.id, userName: actor.name, action: 'excluir', resource: 'treino',
    resourceId: id, resourceLabel: `${data.titulo} — ${data.data}`,
  })
  sincronizarDepois([antes.sessao_origem_id])   // apagar um ajuste devolve o treino da turma ao atleta
  revalidar()
  return {}
}

/** Publica os rascunhos do período (turma ou atleta). Publicado = o atleta vê. */
export async function publicarPeriodo(escopo: { turma_id?: string; aluno_id?: string }, de: string, ate: string): Promise<{ error?: string; publicados?: number }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  let q = db.from('treino_sessoes').update({ status: 'publicado', publicado_em: new Date().toISOString() })
    .eq('status', 'rascunho').gte('data', de).lte('data', ate)
  q = escopo.turma_id ? q.eq('turma_id', escopo.turma_id) : q.eq('aluno_id', escopo.aluno_id)
  const { data, error } = await q.select('id')
  if (error) return { error: friendlyError(error, 'Erro ao publicar.') }
  const ids = ((data ?? []) as { id: string }[]).map((x) => x.id)
  // Na turma, publica junto os ajustes individuais desses treinos.
  if (escopo.turma_id && ids.length) {
    await db.from('treino_sessoes').update({ status: 'publicado', publicado_em: new Date().toISOString() }).in('sessao_origem_id', ids).eq('status', 'rascunho')
  }
  const n = ids.length
  sincronizarDepois(ids)
  if (n) {
    await logAudit({
      userId: actor.id, userName: actor.name, action: 'status', resource: 'treino',
      resourceId: escopo.turma_id ?? escopo.aluno_id!, resourceLabel: `Publicou ${n} treino(s) de ${de} a ${ate}`,
      after: { status: 'publicado', de, ate },
    })
  }
  revalidar()
  return { publicados: n }
}

/** Copia o treino da turma como ajuste individual de um atleta (substitui o da turma para ele). */
export async function criarAjuste(sessaoId: string, alunoId: string): Promise<{ error?: string; id?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const { data: s } = await db.from('treino_sessoes').select('*, treino_passos(*)').eq('id', sessaoId).maybeSingle()
  if (!s || !s.turma_id) return { error: 'Treino da turma não encontrado.' }
  const { data: existente } = await db.from('treino_sessoes').select('id').eq('sessao_origem_id', sessaoId).eq('aluno_id', alunoId).maybeSingle()
  if (existente) return { id: existente.id }
  return salvarSessao({
    aluno_id: alunoId,
    sessao_origem_id: sessaoId,
    data: s.data,
    titulo: s.titulo,
    tipo: s.tipo,
    modalidade: s.modalidade,
    local: s.local,
    chave: s.chave,
    notas: s.notas,
    intensidade_tipo: s.intensidade_tipo,
    intensidade_alvo: s.intensidade_alvo,
    passos: (s.treino_passos ?? []) as Passo[],
    publicar: s.status === 'publicado',
  })
}

export type LimiarForm = {
  aluno_id: string
  modalidade: 'running' | 'cycling' | 'swimming'
  pace_s?: number | null
  velocidade_kmh?: number | null
  ftp_w?: number | null
  fc_max?: number | null
  fc_limiar?: number | null
}

/** Limiar manual do atleta (sobrepõe o teste). Tudo vazio = volta a usar o teste. */
export async function salvarLimiar(f: LimiarForm): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const vals = { pace_s: f.pace_s ?? null, velocidade_kmh: f.velocidade_kmh ?? null, ftp_w: f.ftp_w ?? null, fc_max: f.fc_max ?? null, fc_limiar: f.fc_limiar ?? null }
  const vazio = Object.values(vals).every((v) => v === null)
  const { error } = vazio
    ? await db.from('atleta_limiares').delete().eq('aluno_id', f.aluno_id).eq('modalidade', f.modalidade)
    : await db.from('atleta_limiares').upsert(
      { aluno_id: f.aluno_id, modalidade: f.modalidade, ...vals, atualizado_por: actor.id, updated_at: new Date().toISOString() },
      { onConflict: 'aluno_id,modalidade' },
    )
  if (error) return { error: friendlyError(error, 'Erro ao salvar o limiar.') }
  await logAudit({
    userId: actor.id, userName: actor.name, action: 'editar', resource: 'treino',
    resourceId: f.aluno_id, resourceLabel: `Limiar (${f.modalidade})`, after: vals,
  })
  revalidar()
  return {}
}

/** "Reenviar ao Intervals": refaz o envio da sessão (para um atleta ou todos) e espera o resultado. */
export async function reenviarIntervals(sessaoId: string, alunoId?: string): Promise<{ error?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  // RLS: só reenvia o que o usuário enxerga (titular, auxiliar ou admin).
  const { data: s } = await db.from('treino_sessoes').select('id, status').eq('id', sessaoId).maybeSingle()
  if (!s) return { error: 'Treino não encontrado.' }
  if (s.status !== 'publicado') return { error: 'Publique o treino antes de enviar.' }
  const { sincronizarSessao } = await import('@/lib/intervals/sync')
  await sincronizarSessao(sessaoId, alunoId)
  const { data: falhas } = await db.from('treino_entregas').select('erro_envio').eq('sessao_id', sessaoId).not('erro_envio', 'is', null)
  revalidar()
  return falhas?.length ? { error: `Não foi possível enviar para ${falhas.length} atleta(s): ${falhas[0].erro_envio}` } : {}
}
