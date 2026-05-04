import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge, { statusPagamentoVariant } from '@/components/ui/Badge'
import { Users, Users2, CreditCard, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, calcularIdade } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalAlunos },
    { count: alunosAtivos },
    { count: totalTurmas },
    { count: pagamentosPendentes },
    { data: ultimosAlunos },
    { data: pagamentosAtrasados },
  ] = await Promise.all([
    supabase.from('alunos').select('*', { count: 'exact', head: true }),
    supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('turmas').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('pagamentos').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('alunos').select('id, nome, data_nascimento, turmas:turma_id ( nome )').order('created_at', { ascending: false }).limit(5),
    supabase.from('pagamentos').select('id, valor, vencimento, status, alunos:aluno_id ( nome )').in('status', ['pendente', 'atrasado']).order('vencimento').limit(5),
  ])

  const stats = [
    { label: 'Total de Atletas', value: totalAlunos ?? 0, icon: Users, color: 'text-sky-400' },
    { label: 'Atletas Ativos', value: alunosAtivos ?? 0, icon: Users, color: 'text-green-500' },
    { label: 'Turmas Ativas', value: totalTurmas ?? 0, icon: Users2, color: 'text-sky-400' },
    { label: 'Pgtos Pendentes', value: pagamentosPendentes ?? 0, icon: CreditCard, color: 'text-yellow-500' },
  ]

  type UltimoAluno = { id: string; nome: string; data_nascimento: string | null; turmas: { nome: string } | null }
  type PgtoAtrasado = { id: string; valor: number; vencimento: string; status: string; alunos: { nome: string } | null }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-500">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Visão geral da escolinha</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-navy-500">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimos alunos */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy-500">Últimos atletas cadastrados</h2>
            <Link href="/alunos" className="text-xs text-sky-400 hover:underline">Ver todos</Link>
          </div>
          {(ultimosAlunos ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum(a) atleta ainda.</p>
          ) : (
            <div className="space-y-3">
              {(ultimosAlunos as unknown as UltimoAluno[]).map((a) => (
                <Link key={a.id} href={`/alunos/${a.id}`} className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                  <div>
                    <p className="text-sm font-medium text-navy-500">{a.nome}</p>
                    <p className="text-xs text-gray-400">{(a.turmas as { nome: string } | null)?.nome ?? '—'}</p>
                  </div>
                  {a.data_nascimento && (
                    <span className="text-xs text-gray-400">{calcularIdade(a.data_nascimento)} anos</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Pagamentos pendentes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-navy-500">Pagamentos pendentes</h2>
            <Link href="/financeiro" className="text-xs text-sky-400 hover:underline">Ver todos</Link>
          </div>
          {(pagamentosAtrasados ?? []).length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-green-600 py-4 justify-center">
              <AlertCircle size={16} />
              Nenhum pagamento pendente!
            </div>
          ) : (
            <div className="space-y-3">
              {(pagamentosAtrasados as unknown as PgtoAtrasado[]).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy-500">
                      {(p.alunos as { nome: string } | null)?.nome ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">Vence {formatDate(p.vencimento)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(p.valor)}</span>
                    <Badge variant={statusPagamentoVariant(p.status)}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
