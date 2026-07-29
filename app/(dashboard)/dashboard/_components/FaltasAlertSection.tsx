import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type PresencaBasic = { aluno_id: string; data: string; presente: boolean; justificada: boolean }
type AlunoAlerta = { alunoId: string; nome: string; turmaId: string; turmaNome: string; ultimasFaltas: string[] }

export default async function FaltasAlertSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const since = new Date()
  since.setDate(since.getDate() - 90)
  const sinceStr = since.toLocaleDateString('en-CA')

  const [{ data: alunosRaw }, { data: presencasRaw }] = await Promise.all([
    supabase
      .from('alunos')
      .select('id, nome, turma_id, turmas:turma_id ( nome )')
      .eq('status', 'ativo'),
    supabase
      .from('presencas')
      .select('aluno_id, data, presente, justificada')
      .is('deleted_at', null)
      .gte('data', sinceStr)
      .order('data', { ascending: false }),
  ])

  type AlunoBasic = { id: string; nome: string; turma_id: string | null; turmas: { nome: string } | null }
  const alunos = (alunosRaw ?? []) as AlunoBasic[]
  const presencas = (presencasRaw ?? []) as PresencaBasic[]

  const porAluno = new Map<string, PresencaBasic[]>()
  for (const p of presencas) {
    if (!porAluno.has(p.aluno_id)) porAluno.set(p.aluno_id, [])
    porAluno.get(p.aluno_id)!.push(p)
  }

  const alertas: AlunoAlerta[] = []
  for (const aluno of alunos) {
    if (!aluno.turma_id) continue
    const historico = porAluno.get(aluno.id)
    if (!historico || historico.length < 2) continue

    const ultimasDuas = historico.slice(0, 2)
    const ambasFaltaNaoJustificada = ultimasDuas.every((p) => !p.presente && !p.justificada)
    if (!ambasFaltaNaoJustificada) continue

    alertas.push({
      alunoId: aluno.id,
      nome: aluno.nome,
      turmaId: aluno.turma_id,
      turmaNome: aluno.turmas?.nome ?? '—',
      ultimasFaltas: ultimasDuas.map((p) => p.data),
    })
  }

  if (alertas.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="text-amber-500" />
        <h2 className="text-sm font-semibold text-navy-500">
          Atenção: 2 faltas não justificadas seguidas
        </h2>
      </div>
      <div className="space-y-2">
        {alertas.map((a) => (
          <Link key={a.alunoId} href={`/alunos/${a.alunoId}`}>
            <Card className="hover:border-amber-300 transition-colors cursor-pointer border-amber-100 bg-amber-50/50 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-navy-500 truncate">{a.nome}</p>
                  <p className="text-[11px] text-gray-400 truncate">{a.turmaNome}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-medium text-amber-600">
                    {a.ultimasFaltas.map((d) => formatDate(d)).reverse().join(' · ')}
                  </p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
                    Ver atleta <ChevronRight size={11} />
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
