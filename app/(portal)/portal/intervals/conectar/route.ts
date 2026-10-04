import { NextResponse, after } from 'next/server'
import { atletaLogado } from '@/lib/portalAtleta'
import { DEV_TOKEN, modoDev, oauthLigado, urlAutorizacao } from '@/lib/intervals/client'
import { criarState } from '@/lib/intervals/estado'
import { enviarFuturos, importarAtividades, salvarConexao } from '@/lib/intervals/sync'

// "Conectar Intervals.icu" no portal: manda o atleta para a autorização no
// Intervals. Em desenvolvimento sem o app OAuth, conecta com a API key pessoal.
export async function GET(req: Request) {
  const { atleta } = await atletaLogado()
  const volta = (q: string) => NextResponse.redirect(new URL(`/portal/conta?intervals=${q}`, req.url))
  if (!atleta) return volta('erro')

  if (oauthLigado()) return NextResponse.redirect(urlAutorizacao(criarState(atleta.aluno.id)))

  if (modoDev()) {
    const erro = await salvarConexao(atleta.aluno.id, process.env.INTERVALS_DEV_ATHLETE_ID!, DEV_TOKEN, 'CALENDAR:WRITE,ACTIVITY:READ')
    if (erro) return volta('erro')
    after(async () => { await importarAtividades(atleta.aluno.id, 14); await enviarFuturos(atleta.aluno.id) })
    return volta('ok')
  }
  return volta('indisponivel')
}
