import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/assert'
import { lerTreinoFit } from '@/lib/treinos/fit'
import { salvarModelo } from '@/app/(dashboard)/treinos/biblioteca-actions'

// Importa um FIT de TREINO (estrutura) como modelo da biblioteca
// (porte de FitWorkoutParserService + importação da biblioteca do Movelly).
export async function POST(req: Request) {
  try { await requireStaff() } catch { return NextResponse.json({ error: 'Sem acesso.' }, { status: 403 }) }
  const fd = await req.formData()
  const arquivo = fd.get('arquivo')
  if (!(arquivo instanceof File) || !arquivo.size || arquivo.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Escolha um arquivo .fit de treino (até 2 MB).' }, { status: 400 })
  const t = lerTreinoFit(new Uint8Array(await arquivo.arrayBuffer()))
  if (!t?.passos.length) return NextResponse.json({ error: 'O arquivo não traz a estrutura de um treino (talvez seja de uma atividade feita).' }, { status: 400 })
  const titulo = (t.titulo?.trim() || arquivo.name.replace(/\.fit$/i, '')).slice(0, 120)
  const r = await salvarModelo({
    titulo, modalidade: t.modalidade, tipo: t.passos.some((p) => p.repeticoes) ? 'interval' : 'base', pasta_id: String(fd.get('pasta') ?? '') || null,
    passos: t.passos, forcar: true,
  })
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true, id: r.id, titulo })
}
