import { NOMES_ZONA, faixaTempo, faixaVelocidade, type Zona } from '@/lib/zonas'

// Zonas Z1–Z5 de um teste. Corrida: pace + tempos de 400 m/200 m (a pista da
// Marinha tem 400 m e muitos atletas não usam relógio). Ciclismo: km/h + volta de 400 m.
export default function TabelaZonas({ zonas, modalidade, compacta = false }: {
  zonas: Zona[]
  modalidade: 'corrida' | 'ciclismo'
  compacta?: boolean
}) {
  const th = 'text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide pb-2 pr-3 print:text-gray-600'
  const td = 'py-1.5 pr-3 whitespace-nowrap text-gray-700 tabular-nums'
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${compacta ? 'text-xs' : 'text-sm'}`}>
        <thead>
          <tr>
            <th className={th}>Zona</th>
            {modalidade === 'corrida' ? (
              <>
                <th className={th}>Pace (/km)</th>
                <th className={th}>400 m</th>
                <th className={th}>200 m</th>
              </>
            ) : (
              <>
                <th className={th}>km/h</th>
                <th className={th}>Volta 400 m</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {zonas.map((z) => (
            <tr key={z.zona}>
              <td className="py-1.5 pr-3 whitespace-nowrap">
                <span className="font-semibold text-navy-500">Z{z.zona}</span>
                <span className="text-gray-400 text-xs ml-1.5">{NOMES_ZONA[z.zona - 1]}</span>
                {!compacta && (
                  <span className="text-gray-300 text-[11px] ml-1.5">
                    {z.pctMin == null ? `até ${z.pctMax}%` : `${z.pctMin}–${z.pctMax}%`}
                  </span>
                )}
              </td>
              {modalidade === 'corrida' ? (
                <>
                  <td className={td}>{faixaTempo(z, 1000)}</td>
                  <td className={`${td} font-semibold text-navy-500`}>{faixaTempo(z, 400)}</td>
                  <td className={td}>{faixaTempo(z, 200)}</td>
                </>
              ) : (
                <>
                  <td className={td}>{faixaVelocidade(z)}</td>
                  <td className={`${td} font-semibold text-navy-500`}>{faixaTempo(z, 400)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
