import AuthCard from '../AuthCard'
import EsqueciSenhaForm from './EsqueciSenhaForm'

export default async function EsqueciSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return (
    <AuthCard titulo="Esqueci minha senha">
      <EsqueciSenhaForm linkInvalido={erro === 'link'} />
    </AuthCard>
  )
}
