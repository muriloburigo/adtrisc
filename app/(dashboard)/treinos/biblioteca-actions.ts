'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireStaff } from '@/lib/assert'
import { logAudit } from '@/lib/audit'
import { friendlyError } from '@/lib/errors'
import { metricasPlanejadas, normalizarPassos, referenciaPadrao, validarSessao } from '@/lib/treinos/calculos'
import { MODALIDADES, TIPOS_SESSAO, type Modalidade, type Passo, type TipoSessao } from '@/lib/treinos/tipos'
import { somarDias, inicioSemana } from '@/lib/treinos/datas'
import { salvarSessao } from './actions'
import { sincronizarDepois } from '@/lib/intervals/gatilhos'

// Biblioteca de modelos, pastas e operações do calendário (mover, reordenar,
// duplicar semana) — porte de TrainingLibraryApiController,
// TrainingLibraryFolderApiController, MoveCalendarSessionAction,
// ReorderCalendarDayAction e DuplicateTrainingWeekAction do Movelly.

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
const limpa = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim() || null
const revalidar = () => { revalidatePath('/treinos', 'layout'); revalidatePath('/portal', 'layout') }

// ── Modelos ─────────────────────────────────────────────────────────────────
export type ModeloForm = {
  id?: string
  pasta_id?: string | null
  titulo: string
  modalidade: Modalidade
  tipo: TipoSessao
  local?: string | null
  notas?: string | null
  passos: Partial<Passo>[]
  forcar?: boolean   // salvar mesmo havendo outro com o mesmo nome e modalidade
}

export async function salvarModelo(f: ModeloForm): Promise<{ error?: string; id?: string; duplicado?: boolean }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  if (!(f.tipo in TIPOS_SESSAO) || !(f.modalidade in MODALIDADES)) return { error: 'Tipo ou modalidade inválidos.' }
  const passos = normalizarPassos(f.passos)
  const erros = validarSessao({ titulo: f.titulo, passos })
  if (erros.length) return { error: erros[0] }
  const titulo = limpa(f.titulo)!.slice(0, 120)

  // Aviso de duplicado (checkDuplicate do Movelly): mesmo título e modalidade.
  if (!f.forcar) {
    let q = db.from('treino_modelos').select('id').ilike('titulo', titulo).eq('modalidade', f.modalidade)
    if (f.id) q = q.neq('id', f.id)
    const { data } = await q.limit(1)
    if ((data ?? []).length) return { duplicado: true }
  }

  const m = metricasPlanejadas(passos, referenciaPadrao(f.modalidade))
  const duracao_min = m.duracao_s ? Math.ceil(m.duracao_s / 60) : null
  const dados = {
    pasta_id: f.pasta_id ?? null, titulo, modalidade: f.modalidade, tipo: f.tipo,
    duracao_min, distancia_km: f.modalidade === 'strength' ? null : m.distancia_km,
    local: limpa(f.local), notas: limpa(f.notas), updated_at: new Date().toISOString(),
  }
  let id = f.id
  if (id) {
    const { error } = await db.from('treino_modelos').update(dados).eq('id', id)
    if (error) return { error: friendlyError(error, 'Erro ao salvar o modelo.') }
    await db.from('treino_passos').delete().eq('modelo_id', id)
  } else {
    const { data, error } = await db.from('treino_modelos').insert({ ...dados, criado_por: actor.id }).select('id').single()
    if (error || !data) return { error: friendlyError(error, 'Erro ao criar o modelo.') }
    id = data.id
  }
  if (passos.length) {
    const { error } = await db.from('treino_passos').insert(passos.map(({ id: _i, ...p }) => ({ ...p, modelo_id: id }))) // eslint-disable-line @typescript-eslint/no-unused-vars
    if (error) return { error: friendlyError(error, 'Erro ao salvar os blocos do modelo.') }
  }
  await logAudit({
    userId: actor.id, userName: actor.name, action: f.id ? 'editar' : 'criar', resource: 'treino',
    resourceId: id!, resourceLabel: `Modelo: ${titulo}`, after: { ...dados, passos: passos.length },
  })
  revalidar()
  return { id }
}

export async function apagarModelo(id: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const { data, error } = await db.from('treino_modelos').delete().eq('id', id).select('titulo').maybeSingle()
  if (error) return { error: friendlyError(error, 'Erro ao apagar o modelo.') }
  if (!data) return { error: 'Modelo não encontrado.' }
  await logAudit({ userId: actor.id, userName: actor.name, action: 'excluir', resource: 'treino', resourceId: id, resourceLabel: `Modelo: ${data.titulo}` })
  revalidar()
  return {}
}

export async function moverModelo(id: string, pastaId: string | null): Promise<{ error?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const { error } = await db.from('treino_modelos').update({ pasta_id: pastaId }).eq('id', id)
  if (error) return { error: friendlyError(error, 'Erro ao mover o modelo.') }
  revalidar()
  return {}
}

/** Coloca um modelo da biblioteca num dia do calendário (vira rascunho). */
export async function usarModelo(modeloId: string, data: string, escopo: { turma_id?: string; aluno_id?: string }): Promise<{ error?: string; id?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const { data: m } = await db.from('treino_modelos').select('*, treino_passos(*)').eq('id', modeloId).maybeSingle()
  if (!m) return { error: 'Modelo não encontrado.' }
  return salvarSessao({
    turma_id: escopo.turma_id ?? null, aluno_id: escopo.aluno_id ?? null, data,
    titulo: m.titulo, tipo: m.tipo, modalidade: m.modalidade, local: m.local, notas: m.notas,
    passos: ((m.treino_passos ?? []) as Passo[]).sort((a, b) => a.ordem - b.ordem),
  })
}

/** "Salvar na biblioteca" a partir de um treino do calendário. */
export async function salvarSessaoComoModelo(sessaoId: string, forcar = false): Promise<{ error?: string; id?: string; duplicado?: boolean }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const { data: s } = await db.from('treino_sessoes').select('*, treino_passos(*)').eq('id', sessaoId).maybeSingle()
  if (!s) return { error: 'Treino não encontrado.' }
  return salvarModelo({
    titulo: s.titulo, modalidade: s.modalidade, tipo: s.tipo, local: s.local, notas: s.notas, forcar,
    passos: ((s.treino_passos ?? []) as Passo[]).sort((a, b) => a.ordem - b.ordem),
  })
}

// ── Pastas ──────────────────────────────────────────────────────────────────
export async function criarPasta(nome: string): Promise<{ error?: string; id?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const n = limpa(nome)
  if (!n) return { error: 'Dê um nome à pasta.' }
  const { data: ult } = await db.from('treino_pastas').select('ordem').order('ordem', { ascending: false }).limit(1)
  const { data, error } = await db.from('treino_pastas').insert({ nome: n.slice(0, 80), ordem: (ult?.[0]?.ordem ?? 0) + 1, criado_por: actor.id }).select('id').single()
  if (error || !data) return { error: friendlyError(error, 'Erro ao criar a pasta.') }
  revalidar()
  return { id: data.id }
}

export async function renomearPasta(id: string, nome: string): Promise<{ error?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const n = limpa(nome)
  if (!n) return { error: 'Dê um nome à pasta.' }
  const { error } = await db.from('treino_pastas').update({ nome: n.slice(0, 80) }).eq('id', id)
  if (error) return { error: friendlyError(error, 'Erro ao renomear.') }
  revalidar()
  return {}
}

/** Apaga a pasta; os modelos dela ficam sem pasta (não são apagados). */
export async function apagarPasta(id: string): Promise<{ error?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  const { error } = await db.from('treino_pastas').delete().eq('id', id)
  if (error) return { error: friendlyError(error, 'Erro ao apagar a pasta.') }
  revalidar()
  return {}
}

// ── Calendário: mover, reordenar, duplicar semana ───────────────────────────
/** Arrastar para outro dia (vai para o fim do dia). */
export async function moverSessao(id: string, data: string): Promise<{ error?: string }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: 'Data inválida.' }
  const { data: s } = await db.from('treino_sessoes').select('turma_id, aluno_id, data, titulo').eq('id', id).maybeSingle()
  if (!s) return { error: 'Treino não encontrado.' }
  if (s.data === data) return {}
  let q = db.from('treino_sessoes').select('ordem').eq('data', data).order('ordem', { ascending: false }).limit(1)
  q = s.turma_id ? q.eq('turma_id', s.turma_id) : q.eq('aluno_id', s.aluno_id)
  const { data: ult } = await q
  const { error } = await db.from('treino_sessoes').update({ data, ordem: (ult?.[0]?.ordem ?? 0) + 1, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: friendlyError(error, 'Erro ao mover o treino.') }
  // Ajustes individuais acompanham o treino da turma.
  await db.from('treino_sessoes').update({ data }).eq('sessao_origem_id', id)
  await logAudit({
    userId: actor.id, userName: actor.name, action: 'editar', resource: 'treino',
    resourceId: id, resourceLabel: `${s.titulo}: ${s.data} → ${data}`, before: { data: s.data }, after: { data },
  })
  sincronizarDepois([id])
  revalidar()
  return {}
}

/** Nova ordem dos treinos de um dia (ids na ordem desejada). */
export async function reordenarDia(ids: string[]): Promise<{ error?: string }> {
  await requireStaff()
  const db = (await createClient()) as Db
  for (const [i, id] of ids.entries()) {
    const { error } = await db.from('treino_sessoes').update({ ordem: i + 1 }).eq('id', id)
    if (error) return { error: friendlyError(error, 'Erro ao reordenar.') }
  }
  revalidar()
  return {}
}

/** Copia os treinos de uma semana para outra (como rascunho, com ajustes). */
export async function duplicarSemana(escopo: { turma_id?: string; aluno_id?: string }, semanaOrigem: string, semanaDestino: string): Promise<{ error?: string; copiados?: number }> {
  const actor = await requireStaff()
  const db = (await createClient()) as Db
  const de = inicioSemana(semanaOrigem), para = inicioSemana(semanaDestino)
  if (de === para) return { error: 'Escolha outra semana de destino.' }
  const delta = Math.round((new Date(`${para}T12:00:00Z`).getTime() - new Date(`${de}T12:00:00Z`).getTime()) / 86_400_000)
  let q = db.from('treino_sessoes').select('*, treino_passos(*)').gte('data', de).lte('data', somarDias(de, 6)).is('sessao_origem_id', null)
  q = escopo.turma_id ? q.eq('turma_id', escopo.turma_id) : q.eq('aluno_id', escopo.aluno_id)
  const { data: sessoes, error } = await q
  if (error) return { error: friendlyError(error, 'Erro ao ler a semana.') }
  let n = 0
  for (const s of sessoes ?? []) {
    const r = await salvarSessao({
      turma_id: s.turma_id, aluno_id: s.aluno_id, data: somarDias(s.data, delta), ordem: s.ordem,
      titulo: s.titulo, tipo: s.tipo, modalidade: s.modalidade, local: s.local, chave: s.chave, notas: s.notas,
      intensidade_tipo: s.intensidade_tipo, intensidade_alvo: s.intensidade_alvo,
      passos: ((s.treino_passos ?? []) as Passo[]).sort((a, b) => a.ordem - b.ordem),
    })
    if (r.error) return { error: r.error, copiados: n }
    // Ajustes individuais do treino copiado.
    const { data: ajustes } = await db.from('treino_sessoes').select('*, treino_passos(*)').eq('sessao_origem_id', s.id)
    for (const a of ajustes ?? []) {
      await salvarSessao({
        aluno_id: a.aluno_id, sessao_origem_id: r.id, data: somarDias(a.data, delta),
        titulo: a.titulo, tipo: a.tipo, modalidade: a.modalidade, local: a.local, chave: a.chave, notas: a.notas,
        passos: ((a.treino_passos ?? []) as Passo[]).sort((x, y) => x.ordem - y.ordem),
      })
    }
    n++
  }
  await logAudit({
    userId: actor.id, userName: actor.name, action: 'criar', resource: 'treino',
    resourceId: escopo.turma_id ?? escopo.aluno_id!, resourceLabel: `Duplicou a semana de ${de} para ${para} (${n} treinos)`,
  })
  revalidar()
  return { copiados: n }
}


