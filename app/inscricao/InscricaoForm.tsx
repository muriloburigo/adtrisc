'use client'

import { useActionState, useState } from 'react'
import { submitInscricao } from './actions'

type TurmaOption = { id: string; nome: string; modalidade: string }

const TERMOS = [
  'Autorizo a participação do(a) aluno(a) nas atividades esportivas do projeto, incluindo natação, ciclismo e corrida, nos períodos disponíveis.',
  'Comprometo-me a garantir a frequência e assiduidade do(a) aluno(a) nas aulas, respeitando as regras do projeto.',
  'Autorizo o uso de imagens, fotos e vídeos do(a) aluno(a) para fins institucionais e de divulgação do projeto, sem ônus.',
  'Declaro que o(a) aluno(a) está em condições físicas para participar das atividades esportivas do projeto, ciente de que tais atividades envolvem riscos inerentes, como quedas e acidentes. Reconheço que a equipe do projeto adota todas as medidas necessárias de prevenção e segurança para minimizar esses riscos. Assim, isento o Projeto Escolinha de Triathlon São José, seus organizadores, parceiros e colaboradores de qualquer responsabilidade por eventuais acidentes ou danos que possam ocorrer durante a participação do(a) aluno(a), exceto em casos de negligência comprovada por parte da organização.',
  'Comprometo-me a respeitar os valores sociais, educacionais e esportivos promovidos pela escolinha.',
]

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-navy-500 px-4 sm:px-5 py-3 flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-sky-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 leading-relaxed">{hint}</p>}
    </div>
  )
}

// text-base (16px) prevents iOS Safari from zooming in on focus
const inputClass = 'w-full px-3.5 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
const selectClass = inputClass

function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      {(['sim', 'nao'] as const).map((opt) => (
        <label
          key={opt}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-colors ${
            value === opt
              ? 'border-sky-400 bg-sky-50 text-sky-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="sr-only" />
          {opt === 'sim' ? 'Sim' : 'Não'}
        </label>
      ))}
    </div>
  )
}

export default function InscricaoForm({ turmas }: { turmas: TurmaOption[] }) {
  const [state, formAction, isPending] = useActionState(submitInscricao, null)
  const [aceite, setAceite] = useState(false)
  const [condicaoMedica, setCondicaoMedica] = useState('nao')
  const [tratamento, setTratamento] = useState('nao')
  const [alergia, setAlergia] = useState('nao')

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

      {/* Contato */}
      <Section n={1} title="Contato">
        <Field label="Endereço de e-mail do responsável" required>
          <input
            type="email"
            name="email_responsavel"
            required
            className={inputClass}
            placeholder="email@exemplo.com"
            autoComplete="email"
          />
        </Field>
      </Section>

      {/* Termos */}
      <Section n={2} title="Termos e Condições">
        <p className="text-sm text-gray-600 leading-relaxed">
          Eu, responsável legal pelo(a) aluno(a), declaro que li, compreendi e concordo com os termos abaixo:
        </p>
        <ol className="space-y-3">
          {TERMOS.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-600">
              <span className="flex-shrink-0 w-5 h-5 bg-sky-100 text-sky-600 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ol>
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
            aceite ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-emerald-500 flex-shrink-0"
          />
          <span className="text-sm font-medium text-gray-700">
            Li e aceito todos os termos acima <span className="text-red-500">*</span>
          </span>
        </label>
      </Section>

      {/* Turma */}
      <Section n={3} title="Escolha de Turma">
        <Field label="Escolha uma das opções de turma" required>
          <select name="turma_id" required className={selectClass}>
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

      {/* Dados do atleta */}
      <Section n={4} title="Dados do Atleta">
        <Field label="Nome completo do aluno" required>
          <input
            type="text"
            name="nome"
            required
            className={inputClass}
            placeholder="Nome completo"
            autoComplete="off"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Data de nascimento" required>
            <input type="date" name="data_nascimento" required className={inputClass} />
          </Field>
          <Field label="Sexo biológico" required>
            <select name="sexo" required className={selectClass}>
              <option value="">Selecione...</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </Field>
        </div>
        <Field label="CPF do aluno" hint="Somente números ou com pontuação">
          <input
            type="text"
            name="cpf"
            className={inputClass}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </Field>
        <Field label="Endereço completo de residência">
          <textarea
            name="endereco_completo"
            rows={2}
            className={inputClass + ' resize-none'}
            placeholder="Rua, número, bairro, cidade, CEP"
          />
        </Field>
      </Section>

      {/* Escola */}
      <Section n={5} title="Dados Escolares">
        <Field label="Nome e endereço da escola onde o aluno está matriculado">
          <textarea
            name="escola_nome_endereco"
            rows={2}
            className={inputClass + ' resize-none'}
            placeholder="Nome da escola e endereço"
          />
        </Field>
        <Field label="Série/ano escolar">
          <input
            type="text"
            name="serie_escolar"
            className={inputClass}
            placeholder="Ex: 5º ano do Ensino Fundamental"
          />
        </Field>
      </Section>

      {/* Saúde */}
      <Section n={6} title="Informações de Saúde">
        <Field label="O aluno possui alguma condição médica ou restrição física?">
          <YesNo name="condicao_medica" value={condicaoMedica} onChange={setCondicaoMedica} />
        </Field>
        {condicaoMedica === 'sim' && (
          <Field label="Descreva a condição médica ou restrição física" required>
            <textarea
              name="condicao_medica_descricao"
              rows={3}
              required
              className={inputClass + ' resize-none'}
              placeholder="Descreva aqui..."
            />
          </Field>
        )}

        <Field label="O aluno está em tratamento médico ou faz uso de medicação contínua?">
          <YesNo name="tratamento_medico" value={tratamento} onChange={setTratamento} />
        </Field>
        {tratamento === 'sim' && (
          <Field label="Descreva o tratamento ou medicação" required>
            <textarea
              name="tratamento_medico_descricao"
              rows={3}
              required
              className={inputClass + ' resize-none'}
              placeholder="Descreva aqui..."
            />
          </Field>
        )}

        <Field label="O aluno possui alguma alergia?">
          <YesNo name="alergia" value={alergia} onChange={setAlergia} />
        </Field>
        {alergia === 'sim' && (
          <Field label="Descreva a alergia" required>
            <input
              type="text"
              name="alergia_descricao"
              required
              className={inputClass}
              placeholder="Ex: alergia a medicamentos, alimentos..."
            />
          </Field>
        )}

        <Field
          label="O aluno possui autorização médica para a prática esportiva?"
          hint="Orientamos fortemente que todos os alunos realizem o exame pré-participação com médico do esporte ou cardiologista."
        >
          <select name="autorizacao_medica" className={selectClass}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </Field>
      </Section>

      {/* Esporte */}
      <Section n={7} title="Histórico Esportivo">
        <Field label="O aluno já praticou triathlon ou alguma das modalidades (natação, ciclismo, corrida) anteriormente?">
          <select name="praticou_modalidade" className={selectClass}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </Field>
        <Field label="O aluno tem interesse em participar de eventos e festivais esportivos promovidos pelo projeto?">
          <select name="interesse_eventos" className={selectClass}>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </Field>
        <Field label="Como você ficou sabendo do projeto?">
          <textarea
            name="como_soube"
            rows={2}
            className={inputClass + ' resize-none'}
            placeholder="Ex: redes sociais, amigos, escola..."
          />
        </Field>
      </Section>

      {/* Responsável */}
      <Section n={8} title="Dados do Responsável Legal">
        <Field label="Nome completo do responsável legal" required>
          <input
            type="text"
            name="responsavel_nome"
            required
            className={inputClass}
            placeholder="Nome completo"
            autoComplete="name"
          />
        </Field>
        <Field label="Telefone / WhatsApp para contato" required>
          <input
            type="tel"
            name="responsavel_telefone"
            required
            className={inputClass}
            placeholder="(48) 99999-9999"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="E-mail do responsável legal">
          <input
            type="email"
            name="responsavel_email"
            className={inputClass}
            placeholder="email@exemplo.com"
            autoComplete="email"
          />
        </Field>
      </Section>

      {/* Equipamentos */}
      <Section n={9} title="Equipamentos e Uniforme">
        <Field
          label="Possui bicicleta em condições de uso e segurança?"
          hint="Manutenções frequentes, freios funcionando, pedais íntegros..."
        >
          <select name="tem_bicicleta" className={selectClass}>
            <option value="nao">Não</option>
            <option value="sim">Sim</option>
          </select>
        </Field>
        <Field label="Tamanho da camiseta" required>
          <select name="tamanho_camiseta" required className={selectClass}>
            <option value="">Selecione...</option>
            {['PP', 'P', 'M', 'G', 'GG', 'XGG'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </Section>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {state.error}
        </div>
      )}

      <div className="pb-8">
        <button
          type="submit"
          disabled={isPending || !aceite || turmas.length === 0}
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
