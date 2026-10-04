import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import FormPlano from '@/components/treinos/FormPlano'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function NovoPlanoPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams
  const db = (await createClient()) as Db
  const escopo = sp.aluno
    ? (await db.from('alunos').select('id, nome').eq('id', sp.aluno).maybeSingle()).data
    : sp.turma ? (await db.from('turmas').select('id, nome').eq('id', sp.turma).eq('usa_treinos', true).maybeSingle()).data : null
  if (!escopo) redirect('/treinos')
  const qs = sp.aluno ? `aluno=${sp.aluno}` : `turma=${sp.turma}`

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <Link href={`/treinos/planos?${qs}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500"><ArrowLeft size={14} /> Planos</Link>
      <PageHeader title="Novo plano" subtitle={escopo.nome} />
      <FormPlano escopo={sp.aluno ? { aluno_id: escopo.id } : { turma_id: escopo.id }} />
    </div>
  )
}
