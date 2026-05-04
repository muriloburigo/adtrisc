import Image from 'next/image'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import InscricaoForm from './InscricaoForm'

export const dynamic = 'force-dynamic'

export default async function InscricaoPage() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('turmas')
    .select('id, nome, modalidade')
    .eq('captacao_aberta', true)
    .eq('status', 'ativa')
    .order('nome')

  type TurmaOption = { id: string; nome: string; modalidade: string }
  const turmas = (data ?? []) as TurmaOption[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-navy-500 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
            <Image src="/logo-white.jpg" alt="ADTRISC" width={40} height={40} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-base leading-tight">ADTRISC</h1>
            <p className="text-sky-400 text-xs leading-tight truncate">Associação Desportiva Triatlética de Santa Catarina</p>
          </div>
          <Link
            href="/regras-sorteio"
            className="flex-shrink-0 text-xs text-white/60 hover:text-white transition-colors underline underline-offset-2"
          >
            Regras
          </Link>
        </div>
      </header>

      {/* Title */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <h2 className="text-lg font-bold text-navy-500 leading-tight">Inscrição para Sorteio de Vagas</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Preencha todos os campos para participar do sorteio. Os campos marcados com <span className="text-red-500">*</span> são obrigatórios.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        <InscricaoForm turmas={turmas} />
      </div>
    </div>
  )
}
