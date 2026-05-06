'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Printer } from 'lucide-react'

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
  hasData,
}: {
  mes: number
  ano: number
  hasData: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(nextMes: number, nextAno: number) {
    const params = new URLSearchParams({ mes: String(nextMes), ano: String(nextAno) })
    router.push(`${pathname}?${params}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
      <div className="flex gap-3 flex-1">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Mês
          </label>
          <select
            value={mes}
            onChange={(e) => navigate(Number(e.target.value), ano)}
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
            onChange={(e) => navigate(mes, Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            {gerarAnos().map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {hasData && (
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors whitespace-nowrap"
        >
          <Printer size={16} />
          Imprimir / Salvar PDF
        </button>
      )}
    </div>
  )
}
