'use client'

import { useRouter, usePathname } from 'next/navigation'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function gerarAnos() {
  const ano = new Date().getFullYear()
  return [ano, ano - 1, ano - 2]
}

export default function DiarioMesForm({ mes, ano }: { mes: number; ano: number }) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(nextMes: number, nextAno: number) {
    router.push(`${pathname}?mes=${nextMes}&ano=${nextAno}`)
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mês</label>
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
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ano</label>
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
  )
}
