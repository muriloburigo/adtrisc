'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { submitFicha } from './actions'
import Image from 'next/image'
import { CheckCircle, Pen, RotateCcw } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ficha = Record<string, any>

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3 flex items-center gap-3" style={{ background: '#0C143D' }}>
        <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: '#2AABE1' }}>{n}</span>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 bg-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10 transition-all"

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function SignaturePad({ onChange }: { onChange: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSigned, setHasSigned] = useState(false)
  const hasSignedRef = useRef(false)

  const getPoint = useCallback((e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): [number, number] => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e && e.touches.length > 0) {
      return [
        (e.touches[0].clientX - rect.left) * scaleX,
        (e.touches[0].clientY - rect.top) * scaleY,
      ]
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
        onChange(canvas.toDataURL('image/png'))
      } else {
        onChange(canvas.toDataURL('image/png'))
      }
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
        <canvas
          ref={canvasRef}
          width={700}
          height={160}
          className="w-full touch-none cursor-crosshair block"
          style={{ display: 'block' }}
        />
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
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors"
        >
          <RotateCcw size={13} />
          Limpar assinatura
        </button>
      )}
    </div>
  )
}

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

  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

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

      {/* Participante */}
      <Section n={2} title="Dados do Participante">
        <Field label="Nome completo" required>
          <input name="p_nome" defaultValue={ficha.p_nome ?? ''} required className={inputCls} placeholder="Nome completo" />
        </Field>
        <Row>
          <Field label="Telefone">
            <input name="p_telefone" defaultValue={ficha.p_telefone ?? ''} className={inputCls} placeholder="(47) 99999-0000" />
          </Field>
          <Field label="Sexo">
            <select name="p_sexo" defaultValue={ficha.p_sexo ?? ''} className={inputCls}>
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
        </Row>
        <Field label="Data de nascimento" required>
          <input name="p_data_nascimento" type="date" defaultValue={ficha.p_data_nascimento ?? ''} required className={inputCls} />
        </Field>
        <Row>
          <Field label="Rua">
            <input name="p_rua" defaultValue={ficha.p_rua ?? ''} className={inputCls} placeholder="Nome da rua" />
          </Field>
          <Field label="Número">
            <input name="p_numero" defaultValue={ficha.p_numero ?? ''} className={inputCls} placeholder="Nº" />
          </Field>
        </Row>
        <Row>
          <Field label="Bairro">
            <input name="p_bairro" defaultValue={ficha.p_bairro ?? ''} className={inputCls} placeholder="Bairro" />
          </Field>
          <Field label="CEP">
            <input name="p_cep" defaultValue={ficha.p_cep ?? ''} className={inputCls} placeholder="00000-000" />
          </Field>
        </Row>
        <Field label="Cidade">
          <input name="p_cidade" defaultValue={ficha.p_cidade ?? ''} className={inputCls} placeholder="Cidade" />
        </Field>
      </Section>

      {/* Filiação — Mãe */}
      <Section n={3} title="Filiação — Mãe">
        <Field label="Nome completo da mãe">
          <input name="mae_nome" defaultValue={ficha.mae_nome ?? ''} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Row>
          <Field label="CPF">
            <input name="mae_cpf" defaultValue={ficha.mae_cpf ?? ''} className={inputCls} placeholder="000.000.000-00" />
          </Field>
          <Field label="RG">
            <input name="mae_rg" defaultValue={ficha.mae_rg ?? ''} className={inputCls} placeholder="RG" />
          </Field>
        </Row>
        <Row>
          <Field label="E-mail">
            <input name="mae_email" type="email" defaultValue={ficha.mae_email ?? ''} className={inputCls} placeholder="email@exemplo.com" />
          </Field>
          <Field label="Telefone">
            <input name="mae_telefone" defaultValue={ficha.mae_telefone ?? ''} className={inputCls} placeholder="(47) 99999-0000" />
          </Field>
        </Row>
      </Section>

      {/* Filiação — Pai */}
      <Section n={4} title="Filiação — Pai">
        <Field label="Nome completo do pai">
          <input name="pai_nome" defaultValue={ficha.pai_nome ?? ''} className={inputCls} placeholder="Nome completo" />
        </Field>
        <Row>
          <Field label="CPF">
            <input name="pai_cpf" defaultValue={ficha.pai_cpf ?? ''} className={inputCls} placeholder="000.000.000-00" />
          </Field>
          <Field label="RG">
            <input name="pai_rg" defaultValue={ficha.pai_rg ?? ''} className={inputCls} placeholder="RG" />
          </Field>
        </Row>
        <Row>
          <Field label="E-mail">
            <input name="pai_email" type="email" defaultValue={ficha.pai_email ?? ''} className={inputCls} placeholder="email@exemplo.com" />
          </Field>
          <Field label="Telefone">
            <input name="pai_telefone" defaultValue={ficha.pai_telefone ?? ''} className={inputCls} placeholder="(47) 99999-0000" />
          </Field>
        </Row>
      </Section>

      {/* Autorização */}
      <Section n={5} title="Autorização e Assinatura">
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
          <input name="responsavel_assina" required className={inputCls} placeholder="Nome completo do responsável" />
        </Field>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-sky-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-xs text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
            Li e concordo com os termos acima, declarando que as informações prestadas são verdadeiras.
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Assinatura do responsável <span className="text-red-400">*</span></p>
          <SignaturePad onChange={setSigData} />
        </div>
      </Section>

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
