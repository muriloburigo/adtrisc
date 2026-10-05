import { BookOpen, Zap } from 'lucide-react'

/** Links para o Quick Start e o Manual do módulo (arquivos em public/manuais, só para logados). */
export default function AjudaTreinos({ compacto = false }: { compacto?: boolean }) {
  const cls = compacto
    ? 'inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500'
    : 'inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl px-3 py-1.5'
  return (
    <>
      <a href="/manuais/treinos-quick-start.html" target="_blank" rel="noopener" className={cls} title="O essencial em 5 minutos">
        <Zap size={compacto ? 12 : 14} /> Quick Start
      </a>
      <a href="/manuais/treinos-manual.html" target="_blank" rel="noopener" className={cls} title="Manual completo do módulo de treinos">
        <BookOpen size={compacto ? 12 : 14} /> Manual
      </a>
    </>
  )
}
