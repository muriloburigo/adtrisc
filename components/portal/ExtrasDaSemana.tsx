'use client'

import { useState } from 'react'
import ExtraModal from '@/components/treinos/ExtraModal'
import type { ExecucaoView } from '@/components/treinos/ComparativoTreino'
import { similaridade } from '@/lib/intervals/atividade'

/** Atividades feitas sem treino (portal): tocar para vincular a um treino. */
export default function ExtrasDaSemana({ extras, treinos }: { extras: ExecucaoView[]; treinos: { id: string; data: string; titulo: string; ocupado: boolean; modalidade: string; duracao_min: number | null; distancia_km: number | null }[] }) {
  const [aberta, setAberta] = useState<ExecucaoView | null>(null)
  if (!extras.length) return null
  const dia = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return (
    <section className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Atividades sem treino</p>
      {extras.map((x) => (
        <button key={x.id} onClick={() => setAberta(x)} className="w-full text-left bg-white rounded-xl border border-dashed border-gray-300 p-3">
          <p className="text-sm font-medium text-gray-700">{x.titulo ?? 'Atividade'}</p>
          <p className="text-xs text-gray-400">{dia(x.executado_em).slice(8)}/{dia(x.executado_em).slice(5, 7)}{x.distancia_m ? ` · ${(Number(x.distancia_m) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km` : ''}{x.duracao_s ? ` · ${Math.round(x.duracao_s / 60)} min` : ''} · toque para ligar a um treino</p>
        </button>
      ))}
      {aberta && (
        <ExtraModal extra={aberta} onFechar={() => setAberta(null)}
          opcoes={treinos.filter((t) => !t.ocupado && Math.abs(new Date(`${t.data}T12:00:00Z`).getTime() - new Date(`${dia(aberta.executado_em)}T12:00:00Z`).getTime()) <= 3 * 86_400_000)
.map((t) => ({ id: t.id, rotulo: `${t.data.slice(8)}/${t.data.slice(5, 7)} · ${t.titulo}`, similaridade: similaridade(
              { modalidade: t.modalidade, data: t.data, duracao_s: t.duracao_min ? t.duracao_min * 60 : null, distancia_m: t.distancia_km ? Number(t.distancia_km) * 1000 : null },
              { modalidade: aberta.modalidade ?? '', data: dia(aberta.executado_em), duracao_s: aberta.duracao_s, distancia_m: aberta.distancia_m ? Number(aberta.distancia_m) : null }) }))
            .sort((a, b) => (b.similaridade ?? -1) - (a.similaridade ?? -1))} />
      )}
    </section>
  )
}
