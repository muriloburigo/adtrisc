import { createClient } from '@/lib/supabase/server'
import TrocarSenhaForm from '@/app/(dashboard)/conta/TrocarSenhaForm'
import SairPortal from '@/components/portal/SairPortal'
import { atletaLogado } from '@/lib/portalAtleta'
import { loginDeExibicao } from '@/lib/portal'

export default async function ContaAtletaPage() {
  const { atleta } = await atletaLogado()
  if (!atleta) return null
  const { data: { user } } = await (await createClient()).auth.getUser()

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy-500">Minha conta</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-1">
        <p><span className="text-gray-400">Atleta:</span> {atleta.aluno.nome}</p>
        <p><span className="text-gray-400">Turma:</span> {atleta.aluno.turma ?? '—'}</p>
        <p><span className="text-gray-400">Login:</span> <strong>{loginDeExibicao(user?.email)}</strong></p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-navy-500 mb-3">Trocar senha</p>
        <TrocarSenhaForm />
      </div>
      <p className="text-xs text-gray-400">Esqueceu a senha? Peça ao treinador um link de nova senha.</p>
      <SairPortal />
    </div>
  )
}
