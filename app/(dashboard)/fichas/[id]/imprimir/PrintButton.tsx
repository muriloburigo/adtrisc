'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
      style={{ background: '#0C143D' }}
    >
      Imprimir / Salvar PDF
    </button>
  )
}
