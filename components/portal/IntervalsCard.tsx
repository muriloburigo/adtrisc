'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Unlink, Watch } from 'lucide-react'
import { desconectarIntervals } from '@/app/(portal)/portal/actions'

const AVISOS: Record<string, { ok: boolean; t: string }> = {
  ok: { ok: true, t: 'Intervals.icu conectado! Seus treinos vão para o seu calendário lá (e para o relógio, se ele estiver ligado ao Intervals).' },
  cancelado: { ok: false, t: 'A autorização não foi concluída no Intervals.icu.' },
  expirado: { ok: false, t: 'O link de conexão venceu. Tente de novo.' },
  escopo: { ok: false, t: 'Para funcionar, autorize as duas permissões pedidas (calendário e atividades).' },
  indisponivel: { ok: false, t: 'A conexão com o Intervals.icu ainda não está disponível. Fale com o treinador.' },
  erro: { ok: false, t: 'Não foi possível conectar. Tente de novo.' },
}

export default function IntervalsCard({ conexao, aviso }: {
  conexao: { athlete: string; desde: string; ultima: string | null; erro: string | null } | null
  aviso?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmar, setConfirmar] = useState(false)
  const a = aviso ? AVISOS[aviso] : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-navy-500 flex items-center gap-2"><Watch size={16} className="text-sky-400" /> Intervals.icu e relógio</p>
      {a && <p className={`text-sm rounded-lg px-3 py-2 ${a.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{a.t}</p>}
      {conexao ? (
        <>
          <p className="text-sm text-gray-600">Conectado desde {new Date(conexao.desde).toLocaleDateString('pt-BR')}
            {conexao.ultima && <> · atividades lidas em {new Date(conexao.ultima).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</>}</p>
          {conexao.erro && <p className="text-xs text-amber-700">Último problema: {conexao.erro}</p>}
          {confirmar ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Desconectar?</span>
              <button disabled={pending} onClick={() => startTransition(async () => { await desconectarIntervals(); setConfirmar(false); router.refresh() })}
                className="font-semibold text-red-600">Sim</button>
              <button onClick={() => setConfirmar(false)} className="text-gray-500">Não</button>
            </div>
          ) : (
            <button onClick={() => setConfirmar(true)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600"><Unlink size={14} /> Desconectar</button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500">Conecte sua conta do Intervals.icu (é grátis) para receber os treinos no calendário de lá e no relógio Garmin, e para o treinador ver o que você fez.</p>
          <a href="/portal/intervals/conectar" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2.5"><Link2 size={14} /> Conectar Intervals.icu</a>
        </>
      )}
    </div>
  )
}
