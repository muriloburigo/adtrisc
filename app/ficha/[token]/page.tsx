import { createAdminClient } from '@/lib/supabase/admin'
import Image from 'next/image'
import FichaForm from './FichaForm'
import { CheckCircle, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

function InfoPage({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      <header className="shadow-sm py-4 px-5 flex items-center gap-3" style={{ background: '#0C143D' }}>
        <Image src="/logo.png" alt="ADTRISC" width={36} height={36} className="rounded-lg" />
        <span className="text-white font-bold tracking-wide text-sm">ADTRISC</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="mb-6">{icon}</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#0C143D' }}>{title}</h1>
        <p className="text-gray-500 max-w-sm text-sm">{message}</p>
      </div>
    </div>
  )
}

export default async function FichaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any

  const { data: ficha } = await db
    .from('fichas_inscricao')
    .select('*')
    .eq('token', token)
    .single()

  if (!ficha) {
    return (
      <InfoPage
        icon={<AlertCircle size={48} style={{ color: '#EB2127' }} />}
        title="Link inválido"
        message="Este link de ficha não existe. Verifique se o endereço está correto ou solicite um novo link à equipe ADTRISC."
      />
    )
  }

  if (ficha.status === 'preenchida') {
    return (
      <InfoPage
        icon={<CheckCircle size={48} style={{ color: '#16a34a' }} />}
        title="Ficha já enviada"
        message={`A ficha de ${ficha.p_nome ?? 'participante'} já foi preenchida e enviada. Não é necessário preencher novamente.`}
      />
    )
  }

  if (ficha.status === 'expirada' || new Date(ficha.expires_at) < new Date()) {
    return (
      <InfoPage
        icon={<AlertCircle size={48} style={{ color: '#f59e0b' }} />}
        title="Link expirado"
        message="Este link expirou. Por favor, entre em contato com a equipe ADTRISC para receber um novo link."
      />
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <header className="shadow-sm py-4 px-5 flex items-center gap-3 sticky top-0 z-10" style={{ background: '#0C143D' }}>
        <Image src="/logo.png" alt="ADTRISC" width={36} height={36} className="rounded-lg" />
        <span className="text-white font-bold tracking-wide text-sm">ADTRISC</span>
      </header>

      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* Logos */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-escolinha.png" alt="ADTRISC Escolinha de Triathlon" style={{ height: 52, objectFit: 'contain' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos-estado.png" alt="PIE · Fesporte · Governo de Santa Catarina" style={{ height: 38, objectFit: 'contain' }} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: '#0C143D' }}>Ficha de Inscrição</h1>
          <p className="text-sm text-gray-500 mt-1">
            Preencha os dados abaixo e assine para confirmar a matrícula de{' '}
            <strong>{ficha.p_nome ?? 'participante'}</strong>.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <FichaForm ficha={ficha} token={token} />
      </div>
    </div>
  )
}
