import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge, { statusAlunoVariant, statusTurmaVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import AddFotoModal from './AddFotoModal'
import DeleteFotoButton from './DeleteFotoButton'
import { Users, Pencil, Clock, Plus, FileDown, Images } from 'lucide-react'
import { formatarDiasSemana, formatarHorario, calcularIdade, formatFaixaEtaria, formatSemestre, formatDate } from '@/lib/utils'
import type { TurmaRow, TurmaFotoRow, DiaSemana } from '@/types/database'

type TurmaWithCoach = TurmaRow & { coaches: { full_name: string | null } | null }
type AlunoBasic = { id: string; nome: string; sexo: string | null; data_nascimento: string | null; status: string }

export default async function TurmaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turmaRaw }, { data: alunosRaw }, { data: fotosRaw }] = await Promise.all([
    supabase.from('turmas').select('*, coaches:coach_id ( full_name )').eq('id', id).single(),
    supabase.from('alunos').select('id, nome, sexo, data_nascimento, status').eq('turma_id', id).order('nome'),
    supabase.from('turma_fotos').select('*').eq('turma_id', id).order('data', { ascending: false }),
  ])

  if (!turmaRaw) notFound()

  const turma = turmaRaw as TurmaWithCoach & { dias_semana: DiaSemana[] }
  const alunos = (alunosRaw ?? []) as AlunoBasic[]
  const fotos  = (fotosRaw  ?? []) as TurmaFotoRow[]

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title={turma.nome}
        subtitle={`${turma.modalidade} · ${formatarDiasSemana(turma.dias_semana)}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/turmas/${id}/relatorio`}
              className="flex items-center gap-2 text-sm font-semibold text-navy-500 border border-gray-200 hover:border-sky-400 hover:text-sky-500 px-4 py-2 rounded-xl transition-colors"
            >
              <FileDown size={15} />
              Relatório
            </Link>
            <Link href={`/turmas/${id}/editar`}>
              <Button variant="secondary"><Pencil size={15} />Editar</Button>
            </Link>
          </div>
        }
      />

      {/* Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-xs text-gray-400 mb-1">Horário</p>
          <p className="text-sm font-semibold text-navy-500">
            {formatarHorario(turma.horario_inicio)}–{formatarHorario(turma.horario_fim)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">Atletas / Cap.</p>
          <p className="text-sm font-semibold text-navy-500">{alunos.length} / {turma.capacidade}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">Treinador(a)</p>
          <p className="text-sm font-semibold text-navy-500">{turma.coaches?.full_name ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-400 mb-1">Status</p>
          <Badge variant={statusTurmaVariant(turma.status)}>{turma.status}</Badge>
        </Card>
        {turma.ano && (
          <Card>
            <p className="text-xs text-gray-400 mb-1">Ano</p>
            <p className="text-sm font-semibold text-navy-500">{turma.ano}</p>
          </Card>
        )}
        {turma.semestre && (
          <Card>
            <p className="text-xs text-gray-400 mb-1">Semestre</p>
            <p className="text-sm font-semibold text-navy-500">{formatSemestre(turma.semestre)}</p>
          </Card>
        )}
        {(turma.idade_min != null || turma.idade_max != null) && (
          <Card>
            <p className="text-xs text-gray-400 mb-1">Faixa etária</p>
            <p className="text-sm font-semibold text-navy-500">
              {formatFaixaEtaria(turma.idade_min, turma.idade_max)}
            </p>
          </Card>
        )}
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

      {/* ── Galeria de fotos ── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-navy-500 flex items-center gap-2">
            <Images size={16} className="text-sky-400" />
            Galeria de Fotos
            {fotos.length > 0 && (
              <span className="text-xs font-normal text-gray-400">· {fotos.length} foto{fotos.length !== 1 ? 's' : ''}</span>
            )}
          </h2>
          <AddFotoModal turmaId={id} />
        </div>

        {fotos.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
            <Images size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma foto ainda. Clique em &ldquo;Adicionar foto&rdquo; para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {fotos.map((foto) => (
              <div key={foto.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div className="relative aspect-video">
                  <Image
                    src={foto.url}
                    alt={foto.titulo}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-xs font-semibold text-navy-500 truncate">{foto.titulo}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(foto.data)}</p>
                </div>
                <DeleteFotoButton fotoId={foto.id} storagePath={foto.storage_path} turmaId={id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
