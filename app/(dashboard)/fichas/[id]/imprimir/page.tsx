import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PrintButton from './PrintButton'
import BackButton from '@/components/ui/BackButton'

export const dynamic = 'force-dynamic'

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 py-1 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800">{value || '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-white bg-navy-500 px-3 py-1.5 rounded mb-2"
          style={{ background: '#0C143D' }}>{title}</h2>
      <div className="px-1">{children}</div>
    </div>
  )
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function ImprimirFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data: ficha } = await db.from('fichas_inscricao').select('*').eq('id', id).single()

  if (!ficha) notFound()
  if (ficha.status !== 'preenchida') notFound()

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 15mm 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white">
        {/* Toolbar (hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 bg-gray-50 sticky top-0">
          <BackButton />
          <PrintButton />
        </div>

        {/* Document */}
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {/* Logos header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-escolinha.png" alt="ADTRISC Escolinha de Triathlon" style={{ height: 64, objectFit: 'contain' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos-estado.png" alt="PIE · Fesporte · Governo de Santa Catarina" style={{ height: 46, objectFit: 'contain' }} />
          </div>

          {/* Ficha info */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-6 pb-4 border-b border-gray-100">
            <div>
              <h1 className="text-base font-bold" style={{ color: '#0C143D' }}>Ficha de Inscrição Digital</h1>
              <p className="text-xs text-gray-500">Associação Desportiva Triatlética de Santa Catarina — ADTRISC</p>
            </div>
            <div className="text-xs text-gray-400 sm:text-right">
              <p>Preenchida em {fmt(ficha.preenchido_em)}</p>
              <p>Gerada em {fmt(ficha.gerado_em)}</p>
            </div>
          </div>

          <Section title="Dados do Participante">
            <Row label="Nome" value={ficha.p_nome} />
            <Row label="Sexo" value={ficha.p_sexo === 'M' ? 'Masculino' : ficha.p_sexo === 'F' ? 'Feminino' : ficha.p_sexo} />
            <Row label="Data de Nascimento" value={fmt(ficha.p_data_nascimento)} />
            <Row label="Telefone" value={ficha.p_telefone} />
            <Row label="Endereço" value={[ficha.p_rua, ficha.p_numero].filter(Boolean).join(', ') || null} />
            <Row label="Bairro" value={ficha.p_bairro} />
            <Row label="Cidade" value={ficha.p_cidade} />
            <Row label="CEP" value={ficha.p_cep} />
          </Section>

          {(ficha.mae_nome || ficha.pai_nome) && (
            <Section title="Dados dos Responsáveis">
              {ficha.mae_nome && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Mãe</p>
                  <Row label="Nome" value={ficha.mae_nome} />
                  <Row label="CPF" value={ficha.mae_cpf} />
                  <Row label="RG" value={ficha.mae_rg} />
                  <Row label="Telefone" value={ficha.mae_telefone} />
                  <Row label="E-mail" value={ficha.mae_email} />
                </div>
              )}
              {ficha.pai_nome && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Pai</p>
                  <Row label="Nome" value={ficha.pai_nome} />
                  <Row label="CPF" value={ficha.pai_cpf} />
                  <Row label="RG" value={ficha.pai_rg} />
                  <Row label="Telefone" value={ficha.pai_telefone} />
                  <Row label="E-mail" value={ficha.pai_email} />
                </div>
              )}
            </Section>
          )}

          <Section title="Autorização e Assinatura">
            <Row label="Assinado por" value={ficha.responsavel_assina} />
            <Row label="Aceite dos termos" value={ficha.aceite_termos ? 'Sim' : 'Não'} />
            {ficha.assinatura_data && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">Assinatura digital</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ficha.assinatura_data}
                  alt="Assinatura"
                  className="border border-gray-200 rounded bg-white"
                  style={{ maxHeight: 120, maxWidth: '100%' }}
                />
              </div>
            )}
          </Section>

          <p className="text-[10px] text-gray-300 text-center mt-8">
            Documento gerado pelo sistema ADTRISC · ID {ficha.id}
          </p>
        </div>
      </div>
    </>
  )
}
