import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { ChevronRight } from 'lucide-react'
import { calcularIdade } from '@/lib/utils'

type UltimoAtleta = { id: string; nome: string; data_nascimento: string | null; turmas: { nome: string } | null }

export default async function UltimosAtletasSection() {
  const supabase = await createClient()

  const { data: ultimosAtletasRaw } = await supabase
    .from('alunos')
    .select('id, nome, data_nascimento, turmas:turma_id ( nome )')
    .order('created_at', { ascending: false })
    .limit(5)

  const ultimosAtletas = (ultimosAtletasRaw ?? []) as UltimoAtleta[]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-navy-500">Últimos atletas</h2>
        <Link href="/alunos" className="text-xs text-sky-400 hover:underline flex items-center gap-0.5">
          Ver todos <ChevronRight size={12} />
        </Link>
      </div>
      {ultimosAtletas.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum(a) atleta ainda.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-gray-100">
            {ultimosAtletas.map((a) => (
              <Link
                key={a.id}
                href={`/alunos/${a.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-500 truncate">{a.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{a.turmas?.nome ?? 'Sem turma'}</p>
                </div>
                {a.data_nascimento && (
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{calcularIdade(a.data_nascimento)} anos</span>
                )}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
