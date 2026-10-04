import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { atorParaAtleta, meuAlunoId } from '@/lib/treinos/acesso'
import { requireStaff } from '@/lib/assert'
import { createClient } from '@/lib/supabase/server'
import { gerarFitTreino } from '@/lib/treinos/fit'
import { referenciasDosAtletas, referenciaDe } from '@/lib/treinos/referencia'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import type { Modalidade, Passo } from '@/lib/treinos/tipos'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

// Baixa o treino em FIT (porte de FitWorkoutGeneratorService) para copiar em
// GARMIN/Workouts no relógio. Com atleta (o próprio, ou ?aluno= para a equipe),
// as zonas viram a faixa de velocidade DELE; sem atleta, zona de FC do relógio.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const aluno = new URL(req.url).searchParams.get('aluno') || (await meuAlunoId())
  let db: Db
  if (aluno) {
    const ator = await atorParaAtleta(aluno)
    if (!ator) return NextResponse.json({ error: 'Sem acesso.' }, { status: 403 })
    db = ator.db
  } else {
    try { await requireStaff() } catch { return NextResponse.json({ error: 'Sem acesso.' }, { status: 403 }) }
    db = await createClient()
  }
  // RLS: a equipe vê os treinos da turma; o atleta só os publicados dele.
  const { data: s } = await db.from('treino_sessoes').select('titulo, modalidade, data, treino_passos(*)').eq('id', id).maybeSingle()
  if (!s) return NextResponse.json({ error: 'Treino não encontrado.' }, { status: 404 })
  let ref = null, limites: number[] | undefined
  if (aluno) {
    const [refs, config] = await Promise.all([referenciasDosAtletas(createAdminClient() as Db, [aluno]), getConfigAvaliacao(db)])
    ref = referenciaDe(refs.get(aluno), s.modalidade as Modalidade)
    limites = config.zona_limites
  }
  const fit = gerarFitTreino({ titulo: s.titulo, modalidade: s.modalidade, passos: (s.treino_passos ?? []) as Passo[] }, ref, limites)
  const nome = `${s.data}-${s.titulo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').slice(0, 60)
  return new NextResponse(Buffer.from(fit), { headers: { 'Content-Type': 'application/vnd.ant.fit', 'Content-Disposition': `attachment; filename="${nome}.fit"`, 'Cache-Control': 'no-store' } })
}
