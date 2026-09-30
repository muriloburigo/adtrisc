import { ZONA_LIMITES_PADRAO } from '@/lib/zonas'
import type { ConfigAvaliacaoRow } from '@/types/database'

export type ConfigAvaliacao = Pick<ConfigAvaliacaoRow, 'zona_limites' | 'altura_banco_padrao' | 'natacao_100m_corte_s'>

export const CONFIG_AVALIACAO_PADRAO: ConfigAvaliacao = {
  zona_limites: ZONA_LIMITES_PADRAO,
  altura_banco_padrao: 40,
  natacao_100m_corte_s: null,
}

/** Lê a linha única de config_avaliacao; cai no padrão se ainda não existir. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getConfigAvaliacao(db: any): Promise<ConfigAvaliacao> {
  const { data } = await db
    .from('config_avaliacao')
    .select('zona_limites, altura_banco_padrao, natacao_100m_corte_s')
    .eq('id', 1)
    .maybeSingle()
  if (!data) return CONFIG_AVALIACAO_PADRAO
  return {
    zona_limites: (data.zona_limites as number[]).map(Number),
    altura_banco_padrao: Number(data.altura_banco_padrao),
    natacao_100m_corte_s: data.natacao_100m_corte_s == null ? null : Number(data.natacao_100m_corte_s),
  }
}
