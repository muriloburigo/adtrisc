import { createAdminClient } from '@/lib/supabase/admin'
import { atletaLogado } from '@/lib/portalAtleta'
import { referenciasDosAtletas } from '@/lib/treinos/referencia'
import { getConfigAvaliacao } from '@/lib/config-avaliacao'
import { faixaZona, formatarVelocidade } from '@/lib/treinos/calculos'
import { CORES_ZONA } from '@/lib/treinos/tipos'
import { NOMES_ZONA } from '@/lib/zonas'

type Db = any // eslint-disable-line @typescript-eslint/no-explicit-any
const MODS = [{ k: 'running', nome: 'Corrida' }, { k: 'cycling', nome: 'Ciclismo' }, { k: 'swimming', nome: 'Natação' }] as const
const ORIGEM = { limiar: 'pelo limiar cadastrado pelo treinador', teste: 'pelo seu último teste', padrao: 'valor padrão — você ainda não fez o teste' }

// "Minhas zonas": as faixas de pace/velocidade de cada zona, calculadas pelos testes do atleta.
export default async function ZonasPage() {
  const { db, atleta } = await atletaLogado()
  if (!atleta) return null
  const [refs, config] = await Promise.all([referenciasDosAtletas(createAdminClient() as Db, [atleta.aluno.id]), getConfigAvaliacao(db)])
  const r = refs.get(atleta.aluno.id)!

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold text-navy-500">Minhas zonas</h1>
      <p className="text-sm text-gray-500">Os treinos usam estas zonas. Elas mudam quando você refaz os testes.</p>
      {MODS.map((m) => {
        const ref = r[m.k]
        return (
          <div key={m.k} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-navy-500">{m.nome}</p>
            <p className="text-xs text-gray-400 mb-2">Referência {formatarVelocidade(ref.velocidade_ms, m.k)} · {ORIGEM[ref.origem]}</p>
            <ul className="space-y-1">
              {NOMES_ZONA.map((nome, i) => {
                const f = faixaZona(i + 1, config.zona_limites)
                const lento = formatarVelocidade(ref.velocidade_ms * f.min / 100, m.k), rapido = formatarVelocidade(ref.velocidade_ms * f.max / 100, m.k)
                return (
                  <li key={nome} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_ZONA[i] }} />
                    <span className="font-semibold text-gray-700 w-6">Z{i + 1}</span>
                    <span className="text-gray-500 w-24">{nome}</span>
                    <span className="text-gray-700">{m.k === 'cycling' ? `${lento} – ${rapido}` : `${rapido} – ${lento}`}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
