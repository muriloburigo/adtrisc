'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pen, RotateCcw } from 'lucide-react'
import { TERMOS_INSCRICAO } from '@/lib/termos'

// ── Primitivas de layout, compartilhadas entre /inscricao e /ficha/[token] ──

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
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

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
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

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

// text-base (16px) evita zoom automático no iOS Safari ao focar o campo
export const inputCls = 'w-full px-3.5 py-3 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'

export function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
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

// ── Seções de campos, idênticas nos dois formulários ────────────────────────

export type ParticipanteDefaults = {
  nome?: string | null
  telefone?: string | null
  sexo?: string | null
  data_nascimento?: string | null
  cpf?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
  cidade?: string | null
}

export function DadosParticipanteSection({ n, title = 'Dados do Atleta', defaults }: { n: number; title?: string; defaults?: ParticipanteDefaults }) {
  return (
    <Section n={n} title={title}>
      <Field label="Nome completo" required>
        <input type="text" name="p_nome" defaultValue={defaults?.nome ?? ''} required className={inputCls} placeholder="Nome completo" autoComplete="off" />
      </Field>
      <Row>
        <Field label="Data de nascimento" required>
          <input type="date" name="p_data_nascimento" defaultValue={defaults?.data_nascimento ?? ''} required className={inputCls} />
        </Field>
        <Field label="Sexo biológico" required>
          <select name="p_sexo" defaultValue={defaults?.sexo ?? ''} required className={inputCls}>
            <option value="">Selecione...</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </Field>
      </Row>
      <Row>
        <Field label="Telefone / WhatsApp">
          <input type="tel" name="p_telefone" defaultValue={defaults?.telefone ?? ''} className={inputCls} placeholder="(48) 99999-9999" />
        </Field>
        <Field label="CPF" hint="Somente números ou com pontuação">
          <input type="text" name="p_cpf" defaultValue={defaults?.cpf ?? ''} className={inputCls} placeholder="000.000.000-00" inputMode="numeric" />
        </Field>
      </Row>
      <Row>
        <Field label="Rua">
          <input type="text" name="p_rua" defaultValue={defaults?.rua ?? ''} className={inputCls} placeholder="Nome da rua" />
        </Field>
        <Field label="Número">
          <input type="text" name="p_numero" defaultValue={defaults?.numero ?? ''} className={inputCls} placeholder="Nº" />
        </Field>
      </Row>
      <Row>
        <Field label="Bairro">
          <input type="text" name="p_bairro" defaultValue={defaults?.bairro ?? ''} className={inputCls} placeholder="Bairro" />
        </Field>
        <Field label="CEP">
          <input type="text" name="p_cep" defaultValue={defaults?.cep ?? ''} className={inputCls} placeholder="00000-000" />
        </Field>
      </Row>
      <Field label="Cidade">
        <input type="text" name="p_cidade" defaultValue={defaults?.cidade ?? ''} className={inputCls} placeholder="Cidade" />
      </Field>
    </Section>
  )
}

export function DadosEscolaresSection({ n, defaults }: { n: number; defaults?: { escola_nome_endereco?: string | null; serie_escolar?: string | null } }) {
  return (
    <Section n={n} title="Dados Escolares">
      <Field label="Nome e endereço da escola onde o aluno está matriculado">
        <textarea name="escola_nome_endereco" defaultValue={defaults?.escola_nome_endereco ?? ''} rows={2} className={inputCls + ' resize-none'} placeholder="Nome da escola e endereço" />
      </Field>
      <Field label="Série/ano escolar">
        <input type="text" name="serie_escolar" defaultValue={defaults?.serie_escolar ?? ''} className={inputCls} placeholder="Ex: 5º ano do Ensino Fundamental" />
      </Field>
    </Section>
  )
}

export type SaudeDefaults = {
  condicao_medica?: boolean | null
  condicao_medica_descricao?: string | null
  tratamento_medico?: boolean | null
  tratamento_medico_descricao?: string | null
  alergia?: boolean | null
  alergia_descricao?: string | null
  autorizacao_medica?: boolean | null
}

function ynDefault(v: boolean | null | undefined): string {
  return v == null ? '' : v ? 'sim' : 'nao'
}

export function SaudeSection({ n, defaults }: { n: number; defaults?: SaudeDefaults }) {
  const [condicaoMedica, setCondicaoMedica] = useState(ynDefault(defaults?.condicao_medica))
  const [tratamento, setTratamento] = useState(ynDefault(defaults?.tratamento_medico))
  const [alergia, setAlergia] = useState(ynDefault(defaults?.alergia))

  return (
    <Section n={n} title="Informações de Saúde">
      <Field label="O aluno possui alguma condição médica ou restrição física?">
        <YesNo name="condicao_medica" value={condicaoMedica} onChange={setCondicaoMedica} />
      </Field>
      {condicaoMedica === 'sim' && (
        <Field label="Descreva a condição médica ou restrição física" required>
          <textarea name="condicao_medica_descricao" defaultValue={defaults?.condicao_medica_descricao ?? ''} rows={3} required className={inputCls + ' resize-none'} placeholder="Descreva aqui..." />
        </Field>
      )}

      <Field label="O aluno está em tratamento médico ou faz uso de medicação contínua?">
        <YesNo name="tratamento_medico" value={tratamento} onChange={setTratamento} />
      </Field>
      {tratamento === 'sim' && (
        <Field label="Descreva o tratamento ou medicação" required>
          <textarea name="tratamento_medico_descricao" defaultValue={defaults?.tratamento_medico_descricao ?? ''} rows={3} required className={inputCls + ' resize-none'} placeholder="Descreva aqui..." />
        </Field>
      )}

      <Field label="O aluno possui alguma alergia?">
        <YesNo name="alergia" value={alergia} onChange={setAlergia} />
      </Field>
      {alergia === 'sim' && (
        <Field label="Descreva a alergia" required>
          <input type="text" name="alergia_descricao" defaultValue={defaults?.alergia_descricao ?? ''} required className={inputCls} placeholder="Ex: alergia a medicamentos, alimentos..." />
        </Field>
      )}

      <Field
        label="O aluno possui autorização médica para a prática esportiva?"
        hint="Orientamos fortemente que todos os alunos realizem o exame pré-participação com médico do esporte ou cardiologista."
      >
        <select name="autorizacao_medica" defaultValue={ynDefault(defaults?.autorizacao_medica)} className={inputCls}>
          <option value="">Selecione...</option>
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </select>
      </Field>
    </Section>
  )
}

export function HistoricoEsportivoSection({
  n,
  defaults,
}: {
  n: number
  defaults?: { praticou_modalidade?: boolean | null; interesse_eventos?: boolean | null; como_soube?: string | null }
}) {
  return (
    <Section n={n} title="Histórico Esportivo">
      <Field label="O aluno já praticou triathlon ou alguma das modalidades (natação, ciclismo, corrida) anteriormente?">
        <select name="praticou_modalidade" defaultValue={ynDefault(defaults?.praticou_modalidade)} className={inputCls}>
          <option value="">Selecione...</option>
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </select>
      </Field>
      <Field label="O aluno tem interesse em participar de eventos e festivais esportivos promovidos pelo projeto?">
        <select name="interesse_eventos" defaultValue={ynDefault(defaults?.interesse_eventos)} className={inputCls}>
          <option value="">Selecione...</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </Field>
      <Field label="Como você ficou sabendo do projeto?">
        <textarea name="como_soube" defaultValue={defaults?.como_soube ?? ''} rows={2} className={inputCls + ' resize-none'} placeholder="Ex: redes sociais, amigos, escola..." />
      </Field>
    </Section>
  )
}

export type FiliacaoDefaults = { nome?: string | null; cpf?: string | null; rg?: string | null; email?: string | null; telefone?: string | null }

export function FiliacaoSection({ n, parent, defaults }: { n: number; parent: 'mae' | 'pai'; defaults?: FiliacaoDefaults }) {
  const title = parent === 'mae' ? 'Filiação — Mãe' : 'Filiação — Pai'
  return (
    <Section n={n} title={title}>
      <Field label={`Nome completo ${parent === 'mae' ? 'da mãe' : 'do pai'}`}>
        <input type="text" name={`${parent}_nome`} defaultValue={defaults?.nome ?? ''} className={inputCls} placeholder="Nome completo" />
      </Field>
      <Row>
        <Field label="CPF">
          <input type="text" name={`${parent}_cpf`} defaultValue={defaults?.cpf ?? ''} className={inputCls} placeholder="000.000.000-00" />
        </Field>
        <Field label="RG">
          <input type="text" name={`${parent}_rg`} defaultValue={defaults?.rg ?? ''} className={inputCls} placeholder="RG" />
        </Field>
      </Row>
      <Row>
        <Field label="E-mail">
          <input type="email" name={`${parent}_email`} defaultValue={defaults?.email ?? ''} className={inputCls} placeholder="email@exemplo.com" />
        </Field>
        <Field label="Telefone">
          <input type="tel" name={`${parent}_telefone`} defaultValue={defaults?.telefone ?? ''} className={inputCls} placeholder="(48) 99999-9999" />
        </Field>
      </Row>
    </Section>
  )
}

export function EquipamentosSection({ n, defaults }: { n: number; defaults?: { tem_bicicleta?: boolean | null; tamanho_camiseta?: string | null } }) {
  return (
    <Section n={n} title="Equipamentos e Uniforme">
      <Field label="Possui bicicleta em condições de uso e segurança?" hint="Manutenções frequentes, freios funcionando, pedais íntegros...">
        <select name="tem_bicicleta" defaultValue={ynDefault(defaults?.tem_bicicleta)} className={inputCls}>
          <option value="">Selecione...</option>
          <option value="nao">Não</option>
          <option value="sim">Sim</option>
        </select>
      </Field>
      <Field label="Tamanho da camiseta" required>
        <select name="tamanho_camiseta" defaultValue={defaults?.tamanho_camiseta ?? ''} required className={inputCls}>
          <option value="">Selecione...</option>
          {['PP', 'P', 'M', 'G', 'GG', 'XGG'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>
    </Section>
  )
}

export function TermosSection({ n, aceite, onChange }: { n: number; aceite: boolean; onChange: (v: boolean) => void }) {
  return (
    <Section n={n} title="Termos e Condições">
      <p className="text-sm text-gray-600 leading-relaxed">
        Eu, responsável legal pelo(a) aluno(a), declaro que li, compreendi e concordo com os termos abaixo:
      </p>
      <ol className="space-y-3">
        {TERMOS_INSCRICAO.map((t, i) => (
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
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-emerald-500 flex-shrink-0"
        />
        <span className="text-sm font-medium text-gray-700">
          Li e aceito todos os termos acima <span className="text-red-500">*</span>
        </span>
      </label>
    </Section>
  )
}

// ── Assinatura ────────────────────────────────────────────────────────────

export function SignaturePad({ onChange }: { onChange: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSigned, setHasSigned] = useState(false)
  const hasSignedRef = useRef(false)

  const getPoint = useCallback((e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): [number, number] => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches.length > 0) {
      return [(e.touches[0].clientX - rect.left) * scaleX, (e.touches[0].clientY - rect.top) * scaleY]
    }
    const me = e as MouseEvent
    return [(me.clientX - rect.left) * scaleX, (me.clientY - rect.top) * scaleY]
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#0C143D'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      ctx.beginPath()
      const [x, y] = getPoint(e, canvas)
      ctx.moveTo(x, y)
    }
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      const [x, y] = getPoint(e, canvas)
      ctx.lineTo(x, y)
      ctx.stroke()
      if (!hasSignedRef.current) {
        hasSignedRef.current = true
        setHasSigned(true)
      }
      onChange(canvas.toDataURL('image/png'))
    }
    const endDraw = () => { isDrawingRef.current = false }

    canvas.addEventListener('mousedown', startDraw)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', endDraw)
    canvas.addEventListener('mouseleave', endDraw)
    canvas.addEventListener('touchstart', startDraw, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', endDraw)

    return () => {
      canvas.removeEventListener('mousedown', startDraw)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', endDraw)
      canvas.removeEventListener('mouseleave', endDraw)
      canvas.removeEventListener('touchstart', startDraw)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', endDraw)
    }
  }, [getPoint, onChange])

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    hasSignedRef.current = false
    setHasSigned(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50" style={{ minHeight: 120 }}>
        <canvas ref={canvasRef} width={700} height={160} className="w-full touch-none cursor-crosshair block" style={{ display: 'block' }} />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-2 text-gray-400">
              <Pen size={16} />
              <span className="text-sm">Assine aqui</span>
            </div>
          </div>
        )}
      </div>
      {hasSigned && (
        <button type="button" onClick={clear} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors">
          <RotateCcw size={13} />
          Limpar assinatura
        </button>
      )}
    </div>
  )
}

export function AutorizacaoAssinaturaSection({
  n,
  onSigChange,
  defaultResponsavelAssina,
}: {
  n: number
  onSigChange: (data: string | null) => void
  defaultResponsavelAssina?: string | null
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <Section n={n} title="Autorização e Assinatura">
      <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-600 leading-relaxed border border-gray-100">
        <p>
          Eu, <strong>[nome abaixo]</strong>, autorizo o(a) participante a frequentar as atividades esportivas conforme informado acima.
          Declaro que o(a) participante está em boas condições de saúde, apto(a) à prática de atividades físicas, e isento a ADTRISC,
          seus profissionais e parceiros de qualquer responsabilidade por acidentes ou complicações decorrentes da prática esportiva,
          inclusive por doenças preexistentes. Autorizo, gratuitamente, o uso da imagem do(a) participante em fotos, vídeos e outros
          registros feitos durante as atividades, para fins de divulgação institucional e promocional em mídias impressas, digitais e
          redes sociais. Estou ciente dos riscos inerentes à atividade esportiva e das regras de participação do projeto.
        </p>
        <p className="mt-3 text-gray-500 italic text-[11px]">
          * Orienta-se fortemente que cada participante seja avaliado anualmente por um médico especialista em exercícios físicos na infância e adolescência.
        </p>
      </div>

      <p className="text-xs text-gray-500">São José, {hoje}.</p>

      <Field label="Nome do responsável legal (quem assina)" required>
        <input name="responsavel_assina" defaultValue={defaultResponsavelAssina ?? ''} required className={inputCls} placeholder="Nome completo do responsável" />
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Assinatura do responsável <span className="text-red-500">*</span></p>
        <SignaturePad onChange={onSigChange} />
      </div>
    </Section>
  )
}
