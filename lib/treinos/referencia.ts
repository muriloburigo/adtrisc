// Referência de cada atleta (100% das zonas) por modalidade: o limiar cadastrado
// em atleta_limiares tem prioridade; sem ele, o teste mais recente da ADTRISC
// (Dabonneville 5' → corrida, ciclismo 2 km → ciclismo, natação 100 m → natação).
// É o que transforma "Z4" no pace DAQUELE atleta (montador, portal, Intervals).
import { referenciaPadrao, type Referencia } from './calculos'
import type { Modalidade } from './tipos'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any

export type ReferenciasAtleta = {
  running: Referencia
  cycling: Referencia
  swimming: Referencia
  fcMax: number | null
  ftp: number | null
  limiares: Record<string, { pace_s: number | null; velocidade_kmh: number | null; ftp_w: number | null; fc_max: number | null; fc_limiar: number | null }>
}

type Linha = { aluno_id: string; data: string; resistencia_5min_dabonneville: number | null; ciclismo_2km_tempo: number | null; natacao_100m: number | null }

export async function referenciasDosAtletas(db: Db, alunoIds: string[]): Promise<Map<string, ReferenciasAtleta>> {
  const ids = alunoIds.length ? alunoIds : ['00000000-0000-0000-0000-000000000000']
  const [{ data: limRaw }, { data: avRaw }] = await Promise.all([
    db.from('atleta_limiares').select('aluno_id, modalidade, pace_s, velocidade_kmh, ftp_w, fc_max, fc_limiar').in('aluno_id', ids),
    db.from('avaliacoes_fisicas')
      .select('aluno_id, data, resistencia_5min_dabonneville, ciclismo_2km_tempo, natacao_100m')
      .in('aluno_id', ids).is('deleted_at', null).order('data', { ascending: false }),
  ])
  const avs = (avRaw ?? []) as Linha[]
  const out = new Map<string, ReferenciasAtleta>()
  for (const id of alunoIds) {
    const lim = ((limRaw ?? []) as ({ aluno_id: string; modalidade: string } & ReferenciasAtleta['limiares'][string])[])
      .filter((l) => l.aluno_id === id)
    const limiares = Object.fromEntries(lim.map((l) => [l.modalidade, l]))
    const meus = avs.filter((a) => a.aluno_id === id)
    const ultimo = (campo: keyof Linha) => Number(meus.find((a) => a[campo] != null)?.[campo] ?? 0) || null

    const ref = (modalidade: Modalidade, deLimiar: number | null, deTeste: number | null): Referencia =>
      deLimiar ? { modalidade, velocidade_ms: deLimiar, origem: 'limiar' }
        : deTeste ? { modalidade, velocidade_ms: deTeste, origem: 'teste' }
          : referenciaPadrao(modalidade)

    const dab = ultimo('resistencia_5min_dabonneville')
    const cic = ultimo('ciclismo_2km_tempo')
    const n100 = ultimo('natacao_100m')
    out.set(id, {
      running: ref('running', limiares.running?.pace_s ? 1000 / limiares.running.pace_s : null, dab ? dab / 300 : null),
      cycling: ref('cycling', limiares.cycling?.velocidade_kmh ? Number(limiares.cycling.velocidade_kmh) / 3.6 : null, cic ? 2000 / cic : null),
      swimming: ref('swimming', limiares.swimming?.pace_s ? 100 / limiares.swimming.pace_s : null, n100 ? 100 / n100 : null),
      fcMax: lim.map((l) => l.fc_max).find(Boolean) ?? null,
      ftp: limiares.cycling?.ftp_w ?? null,
      limiares,
    })
  }
  return out
}

/** Referência de uma modalidade (força/outro usam a de corrida só para estimativas). */
export const referenciaDe = (r: ReferenciasAtleta | undefined, modalidade: Modalidade): Referencia | null =>
  !r ? null : modalidade === 'cycling' ? r.cycling : modalidade === 'swimming' ? r.swimming : r.running
