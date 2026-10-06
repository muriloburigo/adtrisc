import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { atorParaAtleta, meuAlunoId } from '@/lib/treinos/acesso'
import { lerAtividadeFit } from '@/lib/treinos/fit'
import { registrarExecucao, sessaoOcupada } from '@/lib/treinos/execucoes'
import { logAudit } from '@/lib/audit'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Upload do FIT de uma atividade para um treino (porte de ProcessUploadedActivityAction).
// Atleta: para os treinos dele. Equipe: campo `aluno` do formulário.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const fd = await req.formData()
  const aluno = String(fd.get('aluno') ?? '') || (await meuAlunoId())
  const arquivo = fd.get('arquivo')
  if (!aluno) return NextResponse.json({ error: 'Atleta não informado.' }, { status: 400 })
  if (!(arquivo instanceof File) || !arquivo.size) return NextResponse.json({ error: 'Escolha o arquivo .fit.' }, { status: 400 })
  if (arquivo.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Arquivo maior que 10 MB.' }, { status: 400 })
  const ator = await atorParaAtleta(aluno)
  if (!ator) return NextResponse.json({ error: 'Sem acesso.' }, { status: 403 })
  const { data: s } = await ator.db.from('treino_sessoes').select('id, titulo, data').eq('id', id).maybeSingle()
  if (!s) return NextResponse.json({ error: 'Treino não encontrado.' }, { status: 404 })

  const buf = new Uint8Array(await arquivo.arrayBuffer())
  const a = lerAtividadeFit(buf)
  if (!a) return NextResponse.json({ error: 'Não é um arquivo FIT de atividade válido.' }, { status: 400 })
  if (await sessaoOcupada(id, aluno)) return NextResponse.json({ error: 'Esse treino já tem uma atividade. Desvincule a atual antes.' }, { status: 409 })

  const caminho = `${aluno}/${Date.now()}.fit`
  const admin = createAdminClient() as Db
  const { error: e1 } = await admin.storage.from('treinos-fit').upload(caminho, buf, { contentType: 'application/octet-stream' })
  if (e1) return NextResponse.json({ error: 'Não foi possível guardar o arquivo.' }, { status: 500 })
  const r = await registrarExecucao(aluno, id, {
    origem: 'upload', atividade_externa_id: `fit-${a.executado_em ?? caminho}`, modalidade: a.modalidade, titulo: arquivo.name.replace(/\.fit$/i, ''),
    executado_em: a.executado_em ?? `${s.data}T12:00:00-03:00`, duracao_s: a.duracao_s, distancia_m: a.distancia_m, fc_media: a.fc_media, fc_max: a.fc_max,
    pace_medio_s_km: a.pace_medio_s_km, velocidade_media_ms: a.velocidade_media_ms, potencia_media_w: a.potencia_media_w, calorias: a.calorias,
    cadencia_media: a.cadencia_media, elevacao_m: a.elevacao_m, zonas: a.zonas, arquivo_fit: caminho,
    dados: { ...a.dados, vinculo: { modo: 'manual', em: new Date().toISOString() } },
  })
  if (r.error) { await admin.storage.from('treinos-fit').remove([caminho]); return NextResponse.json({ error: r.error }, { status: 400 }) }
  await logAudit({ userId: ator.userId, userName: ator.nome, action: 'criar', resource: ator.papel === 'atleta' ? 'portal' : 'treino', resourceId: id, resourceLabel: `Enviou atividade (FIT) para ${s.titulo} — ${s.data}` })
  revalidatePath('/treinos', 'layout'); revalidatePath('/portal', 'layout')
  return NextResponse.json({ ok: true, id: r.id })
}
