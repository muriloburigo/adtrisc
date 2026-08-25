'use client'

import { useState } from 'react'
import { submitFicha } from './actions'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'
import {
  Section,
  DadosParticipanteSection,
  DadosEscolaresSection,
  SaudeSection,
  HistoricoEsportivoSection,
  FiliacaoSection,
  EquipamentosSection,
  TermosSection,
  AutorizacaoAssinaturaSection,
} from '@/components/enrollment/CamposComuns'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ficha = Record<string, any>

function SuccessScreen({ nome }: { nome: string }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>
      <header className="shadow-sm py-4 px-5 flex items-center gap-3" style={{ background: '#0C143D' }}>
        <Image src="/logo.png" alt="ADTRISC" width={36} height={36} className="rounded-lg" />
        <span className="text-white font-bold tracking-wide text-sm">ADTRISC</span>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#dcfce7' }}>
          <CheckCircle size={40} style={{ color: '#16a34a' }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#0C143D' }}>Ficha enviada!</h1>
        <p className="text-gray-500 max-w-sm">
          A ficha de inscrição de <strong>{nome}</strong> foi recebida com sucesso. A equipe da ADTRISC entrará em contato em breve.
        </p>
        <p className="text-xs text-gray-400 mt-6">Você já pode fechar esta página.</p>
      </div>
    </div>
  )
}

export default function FichaForm({ ficha, token }: { ficha: Ficha; token: string }) {
  const [sigData, setSigData] = useState<string | null>(null)
  const [aceite, setAceite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!aceite) { setErrorMsg('Você precisa aceitar os termos de autorização.'); return }
    if (!sigData) { setErrorMsg('Por favor, assine o formulário antes de enviar.'); return }
    setErrorMsg(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('token', token)
    fd.set('aceite_termos', 'true')
    fd.set('assinatura_data', sigData)
    const result = await submitFicha(fd)
    setLoading(false)
    if (result.error) { setErrorMsg(result.error); return }
    setSubmitted(true)
  }

  if (submitted) return <SuccessScreen nome={ficha.p_nome ?? 'participante'} />

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-10">
      {/* Programa */}
      <Section n={1} title="Dados do Programa">
        <div className="bg-sky-50 rounded-xl p-4 text-sm space-y-1 text-gray-700 border border-sky-100">
          <p><span className="font-medium">OSC:</span> Associação Desportiva Triatlética de Santa Catarina — ADTRISC</p>
          <p><span className="font-medium">Modalidade:</span> Triathlon</p>
          <p><span className="font-medium">Processo:</span> SGPE FESPORTE 5217/2025</p>
          <div className="pt-2 border-t border-sky-100 mt-2">
            <p className="font-medium mb-1">Dias e horários:</p>
            <ul className="space-y-0.5 text-xs text-gray-600">
              <li>• Segunda-Feira — 08h00 às 09h00 (Turma 1 matutino)</li>
              <li>• Quarta-Feira — 08h00 às 09h00 (Turma 1 matutino)</li>
              <li>• Sexta-Feira — 08h00 às 09h00 (Turma 1 matutino)</li>
            </ul>
          </div>
        </div>
      </Section>

      <DadosParticipanteSection
        n={2}
        title="Dados do Participante"
        defaults={{
          nome: ficha.p_nome, telefone: ficha.p_telefone, sexo: ficha.p_sexo, data_nascimento: ficha.p_data_nascimento,
          cpf: ficha.p_cpf, rua: ficha.p_rua, numero: ficha.p_numero, bairro: ficha.p_bairro, cep: ficha.p_cep, cidade: ficha.p_cidade,
        }}
      />
      <DadosEscolaresSection n={3} defaults={{ escola_nome_endereco: ficha.escola_nome_endereco, serie_escolar: ficha.serie_escolar }} />
      <SaudeSection
        n={4}
        defaults={{
          condicao_medica: ficha.condicao_medica, condicao_medica_descricao: ficha.condicao_medica_descricao,
          tratamento_medico: ficha.tratamento_medico, tratamento_medico_descricao: ficha.tratamento_medico_descricao,
          alergia: ficha.alergia, alergia_descricao: ficha.alergia_descricao,
          autorizacao_medica: ficha.autorizacao_medica,
        }}
      />
      <HistoricoEsportivoSection
        n={5}
        defaults={{ praticou_modalidade: ficha.praticou_modalidade, interesse_eventos: ficha.interesse_eventos, como_soube: ficha.como_soube }}
      />
      <FiliacaoSection n={6} parent="mae" defaults={{ nome: ficha.mae_nome, cpf: ficha.mae_cpf, rg: ficha.mae_rg, email: ficha.mae_email, telefone: ficha.mae_telefone }} />
      <FiliacaoSection n={7} parent="pai" defaults={{ nome: ficha.pai_nome, cpf: ficha.pai_cpf, rg: ficha.pai_rg, email: ficha.pai_email, telefone: ficha.pai_telefone }} />
      <EquipamentosSection n={8} defaults={{ tem_bicicleta: ficha.tem_bicicleta, tamanho_camiseta: ficha.tamanho_camiseta }} />
      <TermosSection n={9} aceite={aceite} onChange={setAceite} />
      <AutorizacaoAssinaturaSection n={10} onSigChange={setSigData} defaultResponsavelAssina={ficha.responsavel_assina} />

      {errorMsg && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(235,33,39,0.07)', color: '#EB2127' }}>
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !aceite || !sigData}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: loading ? '#2AABE1' : '#0C143D' }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#2AABE1' }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#0C143D' }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Enviando...
          </span>
        ) : 'Enviar Ficha de Inscrição'}
      </button>
    </form>
  )
}
