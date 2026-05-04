import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusTurmaVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Users2, Plus, Clock, Users } from 'lucide-react'
import { formatarDiasSemana, formatarHorario } from '@/lib/utils'
import type { DiaSemana } from '@/types/database'

export default async function TurmasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('turmas')
    .select('*, coaches:coach_id ( full_name )')
    .order('nome')

  type TurmaRow = {
    id: string; nome: string; modalidade: string; status: string
    dias_semana: DiaSemana[]; horario_inicio: string; horario_fim: string
    capacidade: number; coaches: { full_name: string | null } | null
  }

  const turmas = (data ?? []) as unknown as TurmaRow[]

  return (
    <div className="p-8">
      <PageHeader
        title="Turmas"
        subtitle={`${turmas.length} turma${turmas.length !== 1 ? 's' : ''} cadastrada${turmas.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/turmas/nova">
            <Button><Plus size={16} />Nova Turma</Button>
          </Link>
        }
      />

      {turmas.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users2}
            title="Nenhuma turma cadastrada"
            description="Crie a primeira turma para começar"
            action={
              <Link href="/turmas/nova">
                <Button><Plus size={16} />Nova Turma</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {turmas.map((t) => (
            <Link key={t.id} href={`/turmas/${t.id}`}>
              <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-navy-500">{t.nome}</h3>
                  <Badge variant={statusTurmaVariant(t.status)}>
                    {t.status}
                  </Badge>
                </div>

                <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">{t.modalidade}</p>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-sky-400" />
                    <span>
                      {formatarDiasSemana(t.dias_semana)} · {formatarHorario(t.horario_inicio)}–{formatarHorario(t.horario_fim)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-sky-400" />
                    <span>Cap. {t.capacidade} alunos</span>
                  </div>
                </div>

                {t.coaches?.full_name && (
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
                    Coach: {t.coaches.full_name}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
