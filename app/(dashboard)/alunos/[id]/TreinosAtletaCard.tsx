import Link from 'next/link'
import { CalendarRange, Watch } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cumprimentoDosAtletas } from '@/lib/treinos/cumprimento'
import { hojeISO, somarDias } from '@/lib/treinos/datas'
import { formatDate } from '@/lib/utils'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

const SIT: Record<string, { t: string; c: string }> = {
  feito: { t: 'feito', c: 'text-green-700 bg-green-50' }, parcial: { t: 'parcial', c: 'text-amber-700 bg-amber-50' },
  nao_feito: { t: 'não fez', c: 'text-red-600 bg-red-50' }, planejado: { t: 'sem registro', c: 'text-gray-500 bg-gray-50' },
}

/** Aba/cartão "Treinos" na página do atleta: cumprimento dos últimos 30 dias e últimos treinos. */
export default async function TreinosAtletaCard({ aluno }: { aluno: { id: string; turma_id: string | null; profile_id: string | null } }) {
  const db = (await createClient()) as Db
  const c = (await cumprimentoDosAtletas(db, [aluno])).get(aluno.id)!
  const de = somarDias(hojeISO(), -21), ate = somarDias(hojeISO(), -1)
  const [{ data: turma }, { data: proprias }, { data: ents }] = await Promise.all([
    aluno.turma_id ? db.from('treino_sessoes').select('id, data, titulo').eq('turma_id', aluno.turma_id).eq('status', 'publicado').gte('data', de).lte('data', ate) : Promise.resolve({ data: [] }),
    db.from('treino_sessoes').select('id, data, titulo, sessao_origem_id').eq('aluno_id', aluno.id).eq('status', 'publicado').gte('data', de).lte('data', ate),
    db.from('treino_entregas').select('sessao_id, situacao').eq('aluno_id', aluno.id),
  ])
  type S = { id: string; data: string; titulo: string; sessao_origem_id?: string | null }
  const subst = new Set(((proprias ?? []) as S[]).map((s) => s.sessao_origem_id))
  const sit = new Map(((ents ?? []) as { sessao_id: string; situacao: string }[]).map((e) => [e.sessao_id, e.situacao]))
  const ultimos = [...((turma ?? []) as S[]).filter((s) => !subst.has(s.id)), ...((proprias ?? []) as S[])].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6)
  const cor = c.percentual == null ? 'text-gray-400' : c.percentual >= 80 ? 'text-green-600' : c.percentual >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarRange size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500 flex-1">Treinos</h2>
        <Link href={`/treinos?aluno=${aluno.id}`} className="text-xs text-sky-500 hover:underline">abrir calendário</Link>
      </div>
      <div className="flex items-end gap-3">
        <p className={`text-3xl font-bold ${cor}`}>{c.percentual == null ? '—' : `${c.percentual}%`}</p>
        <p className="text-xs text-gray-500 pb-1">{c.feitos} de {c.planejados} treinos nos últimos 30 dias{c.ultimo ? ` · último em ${formatDate(c.ultimo)}` : ''}</p>
      </div>
      <p className="text-xs text-gray-400 flex items-center gap-1.5"><Watch size={12} /> {c.intervals ? 'Intervals.icu conectado' : 'Sem Intervals.icu'} · {c.portal ? 'usa o portal' : 'sem acesso ao portal'}</p>
      {ultimos.length > 0 && (
        <ul className="divide-y divide-gray-50 text-sm">
          {ultimos.map((s) => {
            const st = SIT[sit.get(s.id) ?? 'planejado']
            return (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <span className="text-xs text-gray-400 w-12">{s.data.slice(8)}/{s.data.slice(5, 7)}</span>
                <span className="flex-1 truncate text-gray-700">{s.titulo}</span>
                <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${st.c}`}>{st.t}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
