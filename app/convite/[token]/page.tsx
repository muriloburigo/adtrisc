import Image from 'next/image'
import { AlertCircle } from 'lucide-react'
import ConviteForm from './ConviteForm'
import { lerConvite } from '@/lib/portalConvite'

export const dynamic = 'force-dynamic'

// Página pública do convite do portal do atleta (link mandado pelo WhatsApp).
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const convite = await lerConvite(token)

  return (
    <div className="min-h-[100svh] flex flex-col bg-gray-50">
      <header className="shadow-sm py-4 px-5 flex items-center gap-3 bg-navy-500">
        <Image src="/logo.png" alt="ADTRISC" width={36} height={36} className="rounded-lg" />
        <span className="text-white font-bold tracking-wide text-sm">ADTRISC · Portal do atleta</span>
      </header>
      <main className="flex-1 flex justify-center px-5 py-10">
        {!convite?.valido ? (
          <div className="text-center max-w-sm pt-10">
            <AlertCircle size={44} className="mx-auto text-amber-500 mb-4" />
            <h1 className="text-xl font-bold text-navy-500 mb-2">Link inválido ou vencido</h1>
            <p className="text-sm text-gray-500">Cada link vale por 7 dias e só pode ser usado uma vez. Peça um novo ao treinador.</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-bold text-navy-500">Olá, {convite.aluno.nome.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">
              {convite.tipo === 'criar'
                ? 'Crie seu acesso para ver os treinos que o treinador planejou para você.'
                : 'Defina uma nova senha para o portal.'}
            </p>
            <ConviteForm token={token} tipo={convite.tipo} />
          </div>
        )}
      </main>
    </div>
  )
}
