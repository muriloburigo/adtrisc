import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge, { statusAlunoVariant } from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { Users, Plus } from 'lucide-react'
import { calcularIdade } from '@/lib/utils'

export default async function AlunosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('alunos')
    .select('id, nome, sexo, data_nascimento, status, turma_id, turmas:turma_id ( nome )')
    .order('nome')

  type AlunoRow = {
    id: string; nome: string; sexo: string | null
    data_nascimento: string | null; status: string
    turmas: { nome: string } | null
  }
  const alunos = (data ?? []) as unknown as AlunoRow[]

  return (
    <div className="p-8">
      <PageHeader
        title="Alunos"
        subtitle={`${alunos.length} aluno${alunos.length !== 1 ? 's' : ''} cadastrado${alunos.length !== 1 ? 's' : ''}`}
        action={
          <Link href="/alunos/novo">
            <Button><Plus size={16} />Novo Aluno</Button>
          </Link>
        }
      />

      <Card padding={false}>
        {alunos.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum aluno cadastrado"
            description="Adicione o primeiro aluno ao sistema"
            action={<Link href="/alunos/novo"><Button><Plus size={16} />Novo Aluno</Button></Link>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Turma</th>
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
                  <td className="px-6 py-3.5 text-gray-500">{a.turmas?.nome ?? '—'}</td>
                  <td className="px-6 py-3.5 text-gray-500">
                    {a.sexo === 'M' ? 'Masc.' : a.sexo === 'F' ? 'Fem.' : a.sexo ?? '—'}
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
