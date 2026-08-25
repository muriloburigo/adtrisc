'use client'

import { useActionState, useState } from 'react'
import { submitInscricao } from './actions'
import {
  Section,
  Field,
  inputCls,
  DadosParticipanteSection,
  DadosEscolaresSection,
  SaudeSection,
  HistoricoEsportivoSection,
  FiliacaoSection,
  EquipamentosSection,
  TermosSection,
  AutorizacaoAssinaturaSection,
} from '@/components/enrollment/CamposComuns'

type TurmaOption = { id: string; nome: string; modalidade: string }

export default function InscricaoForm({ turmas }: { turmas: TurmaOption[] }) {
  const [state, formAction, isPending] = useActionState(submitInscricao, null)
  const [aceite, setAceite] = useState(false)
  const [sigData, setSigData] = useState<string | null>(null)

  if (state?.success) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-navy-500 mb-2">Inscrição enviada!</h2>
        <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
          Sua inscrição foi recebida com sucesso. Você será notificado(a) pelo e-mail informado sobre o resultado do sorteio.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="aceite_termos" value={aceite ? 'true' : 'false'} />
      <input type="hidden" name="assinatura_data" value={sigData ?? ''} />

      {/* Contato */}
      <Section n={1} title="Contato">
        <Field label="Endereço de e-mail do responsável" required>
          <input
            type="email"
            name="email_responsavel"
            required
            className={inputCls}
            placeholder="email@exemplo.com"
            autoComplete="email"
          />
        </Field>
      </Section>

      {/* Turma */}
      <Section n={2} title="Escolha de Turma">
        <Field label="Escolha uma das opções de turma" required>
          <select name="turma_id" required className={inputCls}>
            <option value="">Selecione a turma...</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>{t.nome} — {t.modalidade}</option>
            ))}
          </select>
        </Field>
        {turmas.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2.5 rounded-lg">
            Nenhuma turma está com inscrições abertas no momento.
          </p>
        )}
      </Section>

      <DadosParticipanteSection n={3} />
      <DadosEscolaresSection n={4} />
      <SaudeSection n={5} />
      <HistoricoEsportivoSection n={6} />
      <FiliacaoSection n={7} parent="mae" />
      <FiliacaoSection n={8} parent="pai" />
      <EquipamentosSection n={9} />
      <TermosSection n={10} aceite={aceite} onChange={setAceite} />
      <AutorizacaoAssinaturaSection n={11} onSigChange={setSigData} />

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <div className="pb-8">
        <button
          type="submit"
          disabled={isPending || !aceite || !sigData || turmas.length === 0}
          className="w-full bg-sky-400 hover:bg-sky-500 active:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base py-4 rounded-2xl transition-colors shadow-lg"
        >
          {isPending ? 'Enviando inscrição...' : 'Enviar Inscrição'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">
          Ao enviar, você confirma que leu e aceitou os termos acima.{' '}
          <a href="/regras-sorteio" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
            Ver regras do sorteio
          </a>
        </p>
      </div>
    </form>
  )
}
