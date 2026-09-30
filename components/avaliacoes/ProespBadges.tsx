import Badge from '@/components/ui/Badge'
import type { ClassificacaoTeste, NivelDesempenho } from '@/lib/proesp'

export const COR_DESEMPENHO: Record<NivelDesempenho, 'red' | 'yellow' | 'gray' | 'sky' | 'green'> = {
  'Fraco': 'red',
  'Razoável': 'yellow',
  'Bom': 'gray',
  'Muito bom': 'sky',
  'Excelência': 'green',
}

/** Selos PROESP-Br de um teste: desempenho (percentil) e zona de saúde. */
export default function ProespBadges({ c }: { c?: ClassificacaoTeste }) {
  if (!c || (!c.desempenho && !c.saude)) return null
  return (
    <span className="flex flex-wrap gap-1 mt-1">
      {c.desempenho && <Badge variant={COR_DESEMPENHO[c.desempenho]}>{c.desempenho}</Badge>}
      {c.saude === 'risco' && <Badge variant="red">Zona de risco</Badge>}
      {c.saude === 'saudavel' && !c.desempenho && <Badge variant="green">Zona saudável</Badge>}
    </span>
  )
}
