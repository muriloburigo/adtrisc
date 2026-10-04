import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarRange, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import AcoesPlano from '@/components/treinos/AcoesPlano'
import { somarSessoes, formatarDuracao } from '@/lib/treinos/calculos'
import { inicioSemana, diaMes, NOMES_DIA } from '@/lib/treinos/datas'
import { DIFICULDADES, MODALIDADES, OBJETIVOS, TIPOS_SESSAO, type Dificuldade, type Modalidade, type Objetivo, type TipoSessao } from '@/lib/treinos/tipos'
import { formatDate } from '@/lib/utils'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
type Sessao = { id: string; data: string; ordem: number; titulo: string; tipo: TipoSessao; modalidade: Modalidade; duracao_min: number | null; distancia_km: number | null; carga: number | null; chave: boolean; status: string }

export default async function PlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = (await createClient()) as Db
  const { data: p } = await db.from('treino_planos').select('*, turmas(nome), alunos(nome)').eq('id', id).maybeSingle()
  if (!p) notFound()
  const { data: sessoesRaw } = await db.from('treino_sessoes')
    .select('id, data, ordem, titulo, tipo, modalidade, duracao_min, distancia_km, carga, chave, status')
    .eq('plano_id', id).order('data').order('ordem')
  const sessoes = (sessoesRaw ?? []) as Sessao[]
  const qs = p.aluno_id ? `aluno=${p.aluno_id}` : `turma=${p.turma_id}`
  const total = somarSessoes(sessoes)
  const rascunhos = sessoes.filter((s) => s.status === 'rascunho').length

  const porSemana = new Map<string, Sessao[]>()
  for (const s of sessoes) { const k = inicioSemana(s.data); porSemana.set(k, [...(porSemana.get(k) ?? []), s]) }
  const semanas = [...porSemana.entries()]
  const cargaMax = Math.max(1, ...semanas.map(([, ss]) => somarSessoes(ss).carga))

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <Link href={`/treinos/planos?${qs}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500"><ArrowLeft size={14} /> Planos</Link>
      <PageHeader title={p.titulo} subtitle={`${p.turmas?.nome ?? p.alunos?.nome} · ${OBJETIVOS[p.objetivo as Objetivo]} · ${formatDate(p.inicio)} a ${formatDate(p.fim)}`}
        action={<Link href={`/treinos?${qs}&vista=mes&data=${p.inicio}`} className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:underline"><CalendarRange size={14} /> Ver no calendário</Link>} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[['Treinos', sessoes.length], ['Tempo total', formatarDuracao(total.duracao_min * 60)], ['Distância', `${total.distancia_km.toLocaleString('pt-BR')} km`], ['Carga', Math.round(total.carga)]].map(([k, v]) => (
              <div key={k as string} className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-[11px] text-gray-400">{k}</p><p className="font-semibold text-navy-500">{v}</p></div>
            ))}
          </div>
          {sessoes.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl border border-gray-200 p-6">Plano sem treinos. Monte-os no calendário.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {semanas.map(([sem, ss], i) => {
                const t = somarSessoes(ss)
                return (
                  <div key={sem} className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Link href={`/treinos?${qs}&data=${sem}`} className="text-xs font-semibold text-navy-500 hover:text-sky-500 w-28 shrink-0">Semana {i + 1} · {diaMes(sem)}</Link>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-sky-400" style={{ width: `${(t.carga / cargaMax) * 100}%` }} /></div>
                      <p className="text-[11px] text-gray-400 shrink-0">{formatarDuracao(t.duracao_min * 60)} · {t.distancia_km.toLocaleString('pt-BR')} km · carga {Math.round(t.carga)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ss.map((s) => (
                        <span key={s.id} className={`text-[11px] border rounded-lg px-2 py-1 ${s.status === 'rascunho' ? 'border-dashed border-gray-200 bg-gray-50' : 'border-green-200 bg-green-50'}`}>
                          <strong className="text-gray-600">{NOMES_DIA[(new Date(`${s.data}T12:00:00Z`).getUTCDay() + 6) % 7]} {diaMes(s.data)}</strong> {s.titulo} · {TIPOS_SESSAO[s.tipo]}{s.duracao_min ? ` · ${s.duracao_min}′` : ''}
                          {s.chave && <Star size={9} className="inline ml-0.5 text-amber-500 fill-amber-400" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-1">
            <p><span className="text-gray-400">Situação:</span> <strong className={p.status === 'publicado' ? 'text-green-700' : 'text-gray-600'}>{p.status}</strong>{rascunhos > 0 && p.status === 'publicado' ? ` (${rascunhos} rascunho${rascunhos > 1 ? 's' : ''} novo${rascunhos > 1 ? 's' : ''})` : ''}</p>
            <p><span className="text-gray-400">Geração:</span> {p.modo_geracao === 'automatic' ? 'automática' : 'manual'}</p>
            {p.dificuldade && <p><span className="text-gray-400">Nível:</span> {DIFICULDADES[p.dificuldade as Dificuldade]}</p>}
            {p.payload_gerador?.entrada?.modalidade && <p><span className="text-gray-400">Modalidade:</span> {MODALIDADES[p.payload_gerador.entrada.modalidade as Modalidade]}</p>}
            {p.sessoes_semana && <p><span className="text-gray-400">Treinos/semana:</span> {p.sessoes_semana}</p>}
            {p.distancia_alvo_km && <p><span className="text-gray-400">Distância alvo:</span> {Number(p.distancia_alvo_km).toLocaleString('pt-BR')} km</p>}
          </div>
          <AcoesPlano plano={{ id: p.id, titulo: p.titulo, notas: p.notas, prova_alvo_nome: p.prova_alvo_nome, prova_alvo_data: p.prova_alvo_data, inicio: p.inicio }}
            rascunhos={rascunhos} voltar={`/treinos/planos?${qs}`} />
        </aside>
      </div>
    </div>
  )
}
