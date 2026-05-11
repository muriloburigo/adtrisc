'use client'
import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
    >
      <Printer size={16} />
      Imprimir / Salvar PDF
    </button>
  )
}
