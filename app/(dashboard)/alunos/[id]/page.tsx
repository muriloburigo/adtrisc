import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge, { statusAlunoVariant } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Pencil, User, MapPin, Phone, Users2, ClipboardList } from 'lucide-react'
import { formatDate, calcularIdade } from '@/lib/utils'
import type { AlunoRow, ResponsavelRow } from '@/types/database'

type AlunoWithTurma = AlunoRow & { turmas: { id: string; nome: string } | null }

export default async function AlunoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: alunoRaw }, { data: respsRaw }] = await Promise.all([
    supabase.from('alunos').select('*, turmas:turma_id ( id, nome )').eq('id', id).single(),
    supabase
      .from('responsaveis')
      .select('*, aluno_responsavel!inner(aluno_id)')
      .eq('aluno_responsavel.aluno_id', id),
  ])

  if (!alunoRaw) notFound()

  const a = alunoRaw as AlunoWithTurma
  const resps = (respsRaw ?? []) as ResponsavelRow[]

  return (
    <div className="p-8">
      <PageHeader
        title={a.nome}
        subtitle={a.turmas?.nome ?? ''}
        action={
          <div className="flex gap-2">
            <Link href={`/alunos/${id}/avaliacoes`}>
              <Button variant="secondary"><ClipboardList size={15} />Avaliações</Button>
            </Link>
            <Link href={`/alunos/${id}/editar`}>
              <Button variant="secondary"><Pencil size={15} />Editar</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info principal */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-sky-400" />
              <h2 className="text-sm font-semibold text-navy-500">Dados Pessoais</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-400 text-xs">Status</dt>
                <dd className="mt-0.5"><Badge variant={statusAlunoVariant(a.status)}>{a.status}</Badge></dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Turma</dt>
                <dd className="text-gray-800 mt-0.5">
                  {a.turmas
                    ? <Link href={`/turmas/${a.turmas.id}`} className="text-sky-400 hover:underline">{a.turmas.nome}</Link>
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Sexo</dt>
                <dd className="text-gray-800 mt-0.5">
                  {a.sexo === 'M' ? 'Masculino' : a.sexo === 'F' ? 'Feminino' : a.sexo ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Nascimento</dt>
                <dd className="text-gray-800 mt-0.5">
                  {a.data_nascimento
                    ? `${formatDate(a.data_nascimento)} (${calcularIdade(a.data_nascimento)} anos)`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Telefone</dt>
                <dd className="text-gray-800 mt-0.5">{a.telefone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Cadastro</dt>
                <dd className="text-gray-800 mt-0.5">{formatDate(a.created_at)}</dd>
              </div>
            </dl>
            {a.observacoes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Observações</p>
                <p className="text-sm text-gray-700">{a.observacoes}</p>
              </div>
            )}
          </Card>

          {(a.rua || a.cidade) && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-sky-400" />
                <h2 className="text-sm font-semibold text-navy-500">Endereço</h2>
              </div>
              <p className="text-sm text-gray-700">
                {[a.rua, a.numero].filter(Boolean).join(', ')}
                {a.bairro && ` — ${a.bairro}`}
                {a.cidade && `, ${a.cidade}`}
                {a.cep && ` — CEP ${a.cep}`}
              </p>
            </Card>
          )}
        </div>

        {/* Responsáveis */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Users2 size={16} className="text-sky-400" />
            <h2 className="text-sm font-semibold text-navy-500">Responsáveis</h2>
          </div>
          {resps.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum responsável cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {resps.map((r) => (
                <div key={r.id} className="text-sm">
                  <p className="font-medium text-navy-500 capitalize">
                    {r.parentesco === 'mae' ? 'Mãe' : r.parentesco === 'pai' ? 'Pai' : 'Responsável'}
                  </p>
                  <p className="text-gray-700 mt-0.5">{r.nome}</p>
                  {r.telefone && (
                    <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                      <Phone size={11} />{r.telefone}
                    </p>
                  )}
                  {r.email && <p className="text-gray-400 text-xs">{r.email}</p>}
                  {r.cpf && <p className="text-gray-400 text-xs">CPF: {r.cpf}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
