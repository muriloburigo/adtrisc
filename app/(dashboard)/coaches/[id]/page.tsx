import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusTurmaVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Pencil, Mail, Users2, Clock } from 'lucide-react'
import { formatDate, formatarDiasSemana, formatarHorario, formatRole } from '@/lib/utils'
import type { ProfileRow, TurmaRow, DiaSemana } from '@/types/database'
import DeleteCoachButton from './DeleteCoachButton'

type TurmaBasic = Pick<TurmaRow, 'id' | 'nome' | 'modalidade' | 'status' | 'horario_inicio' | 'horario_fim'> & { dias_semana: DiaSemana[] }

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: coachRaw }, { data: turmasRaw }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).eq('role', 'coach').single(),
    supabase.from('turmas').select('id, nome, modalidade, status, dias_semana, horario_inicio, horario_fim')
      .eq('coach_id', id).order('nome'),
  ])

  if (!coachRaw) notFound()

  const coach = coachRaw as ProfileRow
  const turmas = (turmasRaw ?? []) as TurmaBasic[]

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title={coach.full_name ?? 'Treinador(a)'}
        subtitle="Treinador(a)"
        action={
          <div className="flex gap-2">
            <Link href={`/coaches/${id}/editar`}>
              <Button variant="secondary"><Pencil size={15} />Editar</Button>
            </Link>
            <DeleteCoachButton id={id} name={coach.full_name ?? 'este/a treinador(a)'} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados */}
        <Card>
          <div className="flex flex-col items-center text-center py-2">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-2xl mb-4"
              style={{ background: '#2AABE1' }}
            >
              {coach.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <p className="font-bold text-navy-500 text-lg">{coach.full_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatRole(coach.role)}</p>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={15} className="text-sky-400 flex-shrink-0" />
              <span className="truncate">{coach.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users2 size={15} className="text-sky-400 flex-shrink-0" />
              <span>{turmas.length} turma{turmas.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              Desde {formatDate(coach.created_at)}
            </p>
          </div>
        </Card>

        {/* Turmas */}
        <div className="lg:col-span-2">
          <h2 className="text-base font-semibold text-navy-500 mb-3">Turmas</h2>
          {turmas.length === 0 ? (
            <Card>
              <EmptyState icon={Users2} title="Nenhuma turma vinculada" description="Vincule este/a treinador(a) a uma turma" />
            </Card>
          ) : (
            <div className="space-y-3">
              {turmas.map((t) => (
                <Link key={t.id} href={`/turmas/${t.id}`}>
                  <Card className="hover:border-sky-400 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-navy-500">{t.nome}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">{t.modalidade}</p>
                      </div>
                      <Badge variant={statusTurmaVariant(t.status)}>{t.status}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-3">
                      <Clock size={12} className="text-sky-400" />
                      {formatarDiasSemana(t.dias_semana)} · {formatarHorario(t.horario_inicio)}–{formatarHorario(t.horario_fim)}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
