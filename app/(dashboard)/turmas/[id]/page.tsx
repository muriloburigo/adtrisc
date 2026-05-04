import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge, { statusAlunoVariant, statusTurmaVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Users, Pencil, Clock, Plus } from 'lucide-react'
import { formatarDiasSemana, formatarHorario, calcularIdade } from '@/lib/utils'
import type { TurmaRow, DiaSemana } from '@/types/database'

type TurmaWithCoach = TurmaRow & { coaches: { full_name: string | null } | null }
type AlunoBasic = { id: string; nome: string; sexo: string | null; data_nascimento: string | null; status: string }

export default async function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: alunosRaw }] = await Promise.all([
    supabase.from('turmas').select('*, coaches:coach_id ( full_name )').eq('id', id).single(),
    supabase.from('alunos').select('id, nome, sexo, data_nascimento, status').eq('turma_id', id).order('nome'),
  ])

  if (!turmaRaw) notFound()

  const turma = turmaRaw as TurmaWithCoach & { dias_semana: DiaSemana[] }
  const alunos = (alunosRaw ?? []) as AlunoBasic[]

  return (
    <div className="p-8">
      <PageHeader
        title={turma.nome}
        subtitle={`${turma.modalidade} · ${formatarDiasSemana(turma.dias_semana)}`}
        action={
          <Link href={`/turmas/${id}/editar`}>
            <Button variant="secondary"><Pencil size={15} />Editar</Button>
          </Link>
        }
      />

      {/* Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Horário', value: `${formatarHorario(turma.horario_inicio)}–${formatarHorario(turma.horario_fim)}` },
          { label: 'Alunos / Cap.', value: `${alunos.length} / ${turma.capacidade}` },
          { label: 'Treinador(a)', value: turma.coaches?.full_name ?? '—' },
        ].map((item) => (
          <Card key={item.label}>
            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-navy-500">{item.value}</p>
          </Card>
        ))}
        <Card>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <Badge variant={statusTurmaVariant(turma.status)}>{turma.status}</Badge>
        </Card>
      </div>

      {/* Alunos */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-navy-500">Atletas da turma</h2>
        <Link href={`/alunos/novo?turma=${id}`}>
          <Button size="sm"><Plus size={14} />Adicionar atleta</Button>
        </Link>
      </div>

      <Card padding={false}>
        {alunos.length === 0 ? (
          <EmptyState icon={Users} title="Nenhum(a) atleta nesta turma" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Sexo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Idade</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunos.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5">
                    <Link href={`/alunos/${a.id}`} className="font-medium text-navy-500 hover:text-sky-400 transition-colors">
                      {a.nome}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">
                    {a.sexo === 'M' ? 'Masculino' : a.sexo === 'F' ? 'Feminino' : a.sexo ?? '—'}
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">
                    {a.data_nascimento ? `${calcularIdade(a.data_nascimento)} anos` : '—'}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
