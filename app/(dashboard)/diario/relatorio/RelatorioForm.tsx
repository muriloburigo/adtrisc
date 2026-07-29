'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
function gerarAnos() {
  const ano = new Date().getFullYear()
  return [ano, ano - 1, ano - 2]
}

function loadPrefs(key: string): { cref: string; cidade: string; processo: string } {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return { cref: '', cidade: '', processo: '' } }
}

export default function RelatorioForm({
  mes, ano,
  cref: initialCref,
  cidade: initialCidade,
  processo: initialProcesso,
  resumo: initialResumo,
  coachId,
}: {
  mes: number; ano: number
  cref: string; cidade: string; processo: string; resumo: string
  coachId?: string
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const prefKey  = `relatorio-prefs-${coachId ?? 'self'}`

  const [cref, setCref]         = useState(initialCref)
  const [cidade, setCidade]     = useState(initialCidade || 'São José')
  const [processo, setProcesso] = useState(initialProcesso)
  const [resumo, setResumo]     = useState(initialResumo)

  // Restore saved prefs on first load when URL params are absent
  useEffect(() => {
    const saved = loadPrefs(prefKey)
    const nextCref     = initialCref     || saved.cref     || ''
    const nextCidade   = initialCidade   || saved.cidade   || 'São José'
    const nextProcesso = initialProcesso || saved.processo || ''
    if (nextCref !== initialCref || nextCidade !== initialCidade || nextProcesso !== initialProcesso) {
      setCref(nextCref)
      setCidade(nextCidade)
      setProcesso(nextProcesso)
      pushUrl(mes, ano, nextCref, nextCidade, nextProcesso, resumo)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function pushUrl(
    nextMes: number, nextAno: number,
    nextCref: string, nextCidade: string, nextProcesso: string, nextResumo: string
  ) {
    // Persist prefs
    localStorage.setItem(prefKey, JSON.stringify({ cref: nextCref, cidade: nextCidade, processo: nextProcesso }))
    const p = new URLSearchParams({
      mes: String(nextMes), ano: String(nextAno),
      cref: nextCref, cidade: nextCidade, processo: nextProcesso, resumo: nextResumo,
    })
    if (coachId) p.set('coach', coachId)
    router.push(`${pathname}?${p}`)
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className={labelCls}>Mês</label>
          <select value={mes} onChange={(e) => pushUrl(Number(e.target.value), ano, cref, cidade, processo, resumo)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={(e) => pushUrl(mes, Number(e.target.value), cref, cidade, processo, resumo)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white">
            {gerarAnos().map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>CREF do treinador <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
          <input type="text" value={cref} onChange={(e) => setCref(e.target.value)}
            onBlur={() => pushUrl(mes, ano, cref, cidade, processo, resumo)}
            placeholder="Ex: 36090-G/SC" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cidade (rodapé)</label>
          <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)}
            onBlur={() => pushUrl(mes, ano, cref, cidade, processo, resumo)}
            placeholder="Ex: São José" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Processo SGPE <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
          <input type="text" value={processo} onChange={(e) => setProcesso(e.target.value)}
            onBlur={() => pushUrl(mes, ano, cref, cidade, processo, resumo)}
            placeholder="Ex: 5217/2025" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Resumo do mês <span className="normal-case font-normal text-gray-400">(parágrafo introdutório — opcional)</span></label>
        <textarea rows={3} value={resumo} onChange={(e) => setResumo(e.target.value)}
          onBlur={() => pushUrl(mes, ano, cref, cidade, processo, resumo)}
          placeholder="Descreva brevemente as atividades gerais do mês..."
          className={`${inputCls} resize-y`} />
      </div>
    </div>
  )
}
