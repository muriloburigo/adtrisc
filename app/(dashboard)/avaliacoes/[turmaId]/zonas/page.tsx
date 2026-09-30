import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import TabelaZonas from '@/components/avaliacoes/TabelaZonas'
import PrintButton from '@/app/(dashboard)/turmas/[id]/relatorio/PrintButton'
import { ChevronLeft } from 'lucide-react'
import { formatDate, secondsToMmss } from '@/lib/utils'
import { zonasCorrida, zonasCiclismo, minSeg } from '@/lib/zonas'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'

type Modalidade = 'corrida' | 'ciclismo'
type Linha = { aluno_id: string; data: string; resistencia_5min_dabonneville: number | null; ciclismo_2km_tempo: number | null }

// Zonas de todos os atletas ativos da turma, a partir do teste mais recente de
// cada um — a versão do sistema da planilha "zonas de corrida/ciclismo".
export default async function ZonasTurmaPage({
  params,
  searchParams,
}: {
  params: Promise<{ turmaId: string }>
  searchParams: Promise<{ m?: string }>
}) {
  const { turmaId } = await params
  const modalidade: Modalidade = (await searchParams).m === 'ciclismo' ? 'ciclismo' : 'corrida'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [{ data: turma }, { data: alunosRaw }, config] = await Promise.all([
    supabase.from('turmas').select('id, nome').eq('id', turmaId).single(),
    supabase.from('alunos').select('id, nome').eq('turma_id', turmaId).eq('status', 'ativo').order('nome'),
    getConfigAvaliacao(supabase),
  ])
  if (!turma) notFound()

  const alunos = (alunosRaw ?? []) as { id: string; nome: string }[]
  const campo = modalidade === 'corrida' ? 'resistencia_5min_dabonneville' : 'ciclismo_2km_tempo'
  const { data: linhasRaw } = await supabase
    .from('avaliacoes_fisicas')
    .select('aluno_id, data, resistencia_5min_dabonneville, ciclismo_2km_tempo')
    .in('aluno_id', alunos.length ? alunos.map((a) => a.id) : ['__none__'])
    .not(campo, 'is', null)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  // Teste mais recente de cada atleta
  const ultimo = new Map<string, Linha>()
  for (const l of (linhasRaw ?? []) as Linha[]) if (!ultimo.has(l.aluno_id)) ultimo.set(l.aluno_id, l)
  const comTeste = alunos.filter((a) => ultimo.has(a.id))
  const semTeste = alunos.filter((a) => !ultimo.has(a.id))

  const aba = (m: Modalidade, label: string) => (
    <Link
      href={`?m=${m}`}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${modalidade === m ? 'bg-navy-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
    >
      {label}
    </Link>
  )

  return (
    <div className="p-4 sm:p-8 max-w-6xl print:p-0">
      <Link href="/avaliacoes" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 mb-2 print:hidden">
        <ChevronLeft size={13} /> Avaliações
      </Link>
      <PageHeader
        title={`Zonas de ${modalidade} — ${turma.nome}`}
        subtitle={`Limites: ${config.zona_limites.join(' / ')}% da velocidade do teste · ${
          modalidade === 'corrida' ? "base: Dabonneville 5'" : 'base: ciclismo 2 km'}`}
        action={<PrintButton />}
      />

      <div className="flex gap-1 mb-6 print:hidden">
        {aba('corrida', 'Corrida')}
        {aba('ciclismo', 'Ciclismo')}
      </div>

      {comTeste.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum atleta ativo desta turma tem teste de {modalidade} registrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2 print:gap-2">
          {comTeste.map((a) => {
            const l = ultimo.get(a.id)!
            const valor = Number(l[campo])
            const r = modalidade === 'corrida' ? zonasCorrida(valor, config.zona_limites) : zonasCiclismo(valor, config.zona_limites)
            const kmh = r.kmh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
            return (
              <div key={a.id} className="border border-gray-200 rounded-xl p-3 break-inside-avoid">
                <Link href={`/alunos/${a.id}`} className="font-semibold text-sm text-navy-500 hover:underline">{a.nome}</Link>
                <p className="text-[11px] text-gray-400 mb-2">
                  {formatDate(l.data)} ·{' '}
                  {modalidade === 'corrida'
                    ? `${valor.toLocaleString('pt-BR')} m · ${kmh} km/h · ${minSeg((r as ReturnType<typeof zonasCorrida>).paceSKm)}/km`
                    : `${secondsToMmss(valor)} · ${kmh} km/h`}
                </p>
                <TabelaZonas zonas={r.zonas} modalidade={modalidade} compacta />
              </div>
            )
          })}
        </div>
      )}

      {semTeste.length > 0 && (
        <p className="text-xs text-gray-400 mt-6 print:hidden">
          Sem teste de {modalidade}: {semTeste.map((a) => a.nome).join(', ')}.
        </p>
      )}
    </div>
  )
}
