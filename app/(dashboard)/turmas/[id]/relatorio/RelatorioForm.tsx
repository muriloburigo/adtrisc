'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function gerarAnos() {
  const ano = new Date().getFullYear()
  return [ano, ano - 1, ano - 2, ano - 3]
}

export default function RelatorioForm({
  mes,
  ano,
  local: initialLocal,
  cref: initialCref,
  cidade: initialCidade,
}: {
  mes: number
  ano: number
  local: string
  cref: string
  cidade: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [local, setLocal] = useState(initialLocal)
  const [cref, setCref] = useState(initialCref)
  const [cidade, setCidade] = useState(initialCidade)

  function navigate(nextMes: number, nextAno: number, nextLocal: string, nextCref: string, nextCidade: string) {
    const params = new URLSearchParams({
      mes: String(nextMes),
      ano: String(nextAno),
      local: nextLocal,
      cref: nextCref,
      cidade: nextCidade,
    })
    router.push(`${pathname}?${params}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Mês
            </label>
            <select
              value={mes}
              onChange={(e) => navigate(Number(e.target.value), ano, local, cref, cidade)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            >
              {MESES.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Ano
            </label>
            <select
              value={ano}
              onChange={(e) => navigate(mes, Number(e.target.value), local, cref, cidade)}
              className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
            >
              {gerarAnos().map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Local do atendimento
          </label>
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => navigate(mes, ano, local, cref, cidade)}
            placeholder="Ex: Beira Mar São José"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            CREF do treinador <span className="normal-case font-normal text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={cref}
            onChange={(e) => setCref(e.target.value)}
            onBlur={() => navigate(mes, ano, local, cref, cidade)}
            placeholder="Ex: 36090-G/SC"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cidade (rodapé)
          </label>
          <input
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            onBlur={() => navigate(mes, ano, local, cref, cidade)}
            placeholder="Ex: São José"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          />
        </div>
      </div>
    </div>
  )
}
