'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Gauge, Pencil } from 'lucide-react'
import { NOMES_ZONA } from '@/lib/zonas'
import { CORES_ZONA } from '@/lib/treinos/tipos'
import { faixaZona, formatarVelocidade, type Referencia } from '@/lib/treinos/calculos'
import { lerMmss, mostrarMmss } from '@/lib/treinos/blocos'
import { salvarLimiar } from '@/app/(dashboard)/treinos/actions'

type Limiar = { pace_s: number | null; velocidade_kmh: number | null; ftp_w: number | null; fc_max: number | null; fc_limiar: number | null }

const MODS = [
  { k: 'running', nome: 'Corrida', campo: 'pace', ajuda: 'pace de referência (100%) em min/km' },
  { k: 'cycling', nome: 'Ciclismo', campo: 'kmh', ajuda: 'velocidade de referência (100%) em km/h' },
  { k: 'swimming', nome: 'Natação', campo: 'pace', ajuda: 'pace de referência (100%) em min/100 m' },
] as const

const ORIGEM = { limiar: 'limiar cadastrado', teste: 'último teste', padrao: 'sem teste — padrão' }

/** Limiares do atleta (porte do threshold-offcanvas do Movelly) + as zonas resultantes. */
export default function PainelLimiares({ alunoId, referencias, limiares, limites }: {
  alunoId: string
  referencias: Record<string, Referencia>
  limiares: Record<string, Limiar>
  limites: number[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inp = 'border border-gray-200 rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-sky-400'

  function salvar(mod: 'running' | 'cycling' | 'swimming', fd: FormData) {
    setErro(null)
    const n = (k: string) => { const v = String(fd.get(k) ?? '').trim().replace(',', '.'); return v ? Number(v) : null }
    startTransition(async () => {
      const r = await salvarLimiar({
        aluno_id: alunoId, modalidade: mod,
        pace_s: mod === 'cycling' ? null : lerMmss(String(fd.get('pace') ?? '')),
        velocidade_kmh: mod === 'cycling' ? n('kmh') : null,
        ftp_w: mod === 'cycling' ? n('ftp') : null,
        fc_max: n('fc_max'), fc_limiar: n('fc_limiar'),
      })
      if (r.error) { setErro(r.error); return }
      setEditando(null)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-navy-500 flex items-center gap-2 mb-3"><Gauge size={16} className="text-sky-400" /> Limiares e zonas</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {MODS.map((m) => {
          const ref = referencias[m.k]
          const lim = limiares[m.k]
          return (
            <div key={m.k} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-navy-500">{m.nome}</p>
                <button onClick={() => setEditando(editando === m.k ? null : m.k)} className="p-1 text-gray-400 hover:text-sky-500" title="Editar limiar"><Pencil size={13} /></button>
              </div>
              <p className="text-xs text-gray-500">Referência: <strong>{ref ? formatarVelocidade(ref.velocidade_ms, m.k) : '—'}</strong></p>
              <p className="text-[11px] text-gray-400 mb-2">{ref ? ORIGEM[ref.origem] : ''}</p>
              {ref && (
                <ul className="space-y-0.5">
                  {NOMES_ZONA.map((nome, i) => {
                    const f = faixaZona(i + 1, limites)
                    const lento = formatarVelocidade(ref.velocidade_ms * f.min / 100, m.k)
                    const rapido = formatarVelocidade(ref.velocidade_ms * f.max / 100, m.k)
                    return (
                      <li key={nome} className="flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full" style={{ background: CORES_ZONA[i] }} />
                        <span className="font-semibold text-gray-600 w-5">Z{i + 1}</span>
                        <span className="text-gray-500">{m.k === 'cycling' ? `${lento} – ${rapido}` : `${rapido} – ${lento}`}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
              {editando === m.k && (
                <form action={(fd) => salvar(m.k, fd)} className="mt-3 space-y-2 border-t border-gray-100 pt-2">
                  <p className="text-[11px] text-gray-400">{m.ajuda}. Vazio = usar o teste.</p>
                  {m.campo === 'pace'
                    ? <input name="pace" className={inp} placeholder="4:30" defaultValue={mostrarMmss(lim?.pace_s)} />
                    : <input name="kmh" className={inp} placeholder="30" defaultValue={lim?.velocidade_kmh ?? ''} />}
                  <div className="flex gap-2">
                    <input name="fc_max" className={inp} placeholder="FC máx" defaultValue={lim?.fc_max ?? ''} />
                    <input name="fc_limiar" className={inp} placeholder="FC limiar" defaultValue={lim?.fc_limiar ?? ''} />
                  </div>
                  {m.k === 'cycling' && <input name="ftp" className={inp} placeholder="FTP (W)" defaultValue={lim?.ftp_w ?? ''} />}
                  <button disabled={pending} className="text-xs font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">Salvar</button>
                </form>
              )}
            </div>
          )
        })}
      </div>
      {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
    </div>
  )
}
