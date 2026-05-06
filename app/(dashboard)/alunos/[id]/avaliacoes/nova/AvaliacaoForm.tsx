'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAvaliacaoFisica, type AvaliacaoPayload } from '../actions'
import { mmssToSeconds } from '@/lib/utils'

function num(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}
function int(v: string): number | null {
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

type Field = { label: string; unit: string; key: string; step?: string; integer?: boolean }

const CAMPO_MEDIDAS: Field[] = [
  { label: 'Massa Corporal', unit: 'kg',   key: 'massa_corporal',  step: '0.1' },
  { label: 'Estatura',       unit: 'm',    key: 'estatura',        step: '0.001' },
  { label: 'Perímetro da Cintura', unit: 'cm', key: 'perimetro_cintura', step: '0.1' },
  { label: 'Envergadura',    unit: 'cm',   key: 'envergadura',     step: '0.1' },
  { label: 'Estatura Sentado', unit: 'cm', key: 'estatura_sentado', step: '0.1' },
]

const CAMPO_TESTES: Field[] = [
  { label: 'Sentar e Alcançar', unit: 'cm', key: 'sentar_alcancar',        step: '0.1' },
  { label: "Resistência 6'",    unit: 'm',  key: 'resistencia_6min',       step: '1'   },
  { label: 'Força Abdominal',   unit: 'rep',key: 'forca_abdominal',        step: '1', integer: true },
  { label: 'Arremesso Medicineball', unit: 'm', key: 'arremesso_medicineball', step: '0.01' },
  { label: 'Agilidade',         unit: 's',  key: 'agilidade',              step: '0.01' },
  { label: 'Salto Horizontal',  unit: 'm',  key: 'salto_horizontal',       step: '0.01' },
  { label: 'Corrida de 20m',    unit: 's',  key: 'corrida_20m',            step: '0.01' },
  { label: "12' Natação",       unit: 'm',  key: 'natacao_12min',          step: '1'   },
]

const CAMPO_NATACAO: Field[] = [
  { label: '50m Livre',          unit: 'mm:ss', key: 'natacao_50m_livre'   },
  { label: '100m Livre',         unit: 'mm:ss', key: 'natacao_100m_livre'  },
  { label: '200m Livre',         unit: 'mm:ss', key: 'natacao_200m_livre'  },
  { label: '400m Livre',         unit: 'mm:ss', key: 'natacao_400m_livre'  },
  { label: '800m Livre',         unit: 'mm:ss', key: 'natacao_800m_livre'  },
  { label: '1500m Livre',        unit: 'mm:ss', key: 'natacao_1500m_livre' },
  { label: '50m Melhor Estilo',  unit: 'mm:ss', key: 'natacao_50m_estilo'  },
  { label: '100m Melhor Estilo', unit: 'mm:ss', key: 'natacao_100m_estilo' },
  { label: '200m Melhor Estilo', unit: 'mm:ss', key: 'natacao_200m_estilo' },
]

function imcClass(imc: number): string {
  if (imc < 18.5) return 'text-blue-600'
  if (imc < 25)   return 'text-emerald-600'
  if (imc < 30)   return 'text-amber-500'
  return 'text-red-500'
}
function imcLabel(imc: number): string {
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25)   return 'Peso normal'
  if (imc < 30)   return 'Sobrepeso'
  return 'Obesidade'
}

export default function AvaliacaoForm({ alunoId, alunoNome }: { alunoId: string; alunoNome: string }) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [dataAvaliacao, setDataAvaliacao] = useState(today)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [observacoes, setObservacoes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState('')

  const v = (key: string) => valores[key] ?? ''
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValores((prev) => ({ ...prev, [key]: e.target.value }))

  // Calculados
  const mc  = num(v('massa_corporal'))
  const est = num(v('estatura'))
  const pc  = num(v('perimetro_cintura'))

  const alturaCm          = est != null ? +(est * 100).toFixed(1) : null
  const alturaAoQuadrado  = est != null ? +(est * est).toFixed(6)  : null
  const imc               = mc != null && est != null && est > 0 ? +(mc / (est * est)).toFixed(2) : null
  const rce               = pc != null && alturaCm != null && alturaCm > 0 ? +(pc / alturaCm).toFixed(4) : null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const payload: AvaliacaoPayload = {
      data: dataAvaliacao,
      massa_corporal: mc,
      estatura: est,
      perimetro_cintura: pc,
      envergadura: num(v('envergadura')),
      estatura_sentado: num(v('estatura_sentado')),
      altura_cm: alturaCm,
      altura_ao_quadrado: alturaAoQuadrado,
      imc,
      rce,
      sentar_alcancar: num(v('sentar_alcancar')),
      resistencia_6min: num(v('resistencia_6min')),
      forca_abdominal: int(v('forca_abdominal')),
      arremesso_medicineball: num(v('arremesso_medicineball')),
      agilidade: num(v('agilidade')),
      salto_horizontal: num(v('salto_horizontal')),
      corrida_20m: num(v('corrida_20m')),
      natacao_12min: num(v('natacao_12min')),
      natacao_50m_livre: mmssToSeconds(v('natacao_50m_livre')),
      natacao_100m_livre: mmssToSeconds(v('natacao_100m_livre')),
      natacao_200m_livre: mmssToSeconds(v('natacao_200m_livre')),
      natacao_400m_livre: mmssToSeconds(v('natacao_400m_livre')),
      natacao_800m_livre: mmssToSeconds(v('natacao_800m_livre')),
      natacao_1500m_livre: mmssToSeconds(v('natacao_1500m_livre')),
      natacao_50m_estilo: mmssToSeconds(v('natacao_50m_estilo')),
      natacao_100m_estilo: mmssToSeconds(v('natacao_100m_estilo')),
      natacao_200m_estilo: mmssToSeconds(v('natacao_200m_estilo')),
      observacoes: observacoes.trim() || null,
    }

    startTransition(async () => {
      const result = await createAvaliacaoFisica(alunoId, payload)
      if (result.error) {
        setErro(result.error)
        return
      }
      router.push(`/alunos/${alunoId}/avaliacoes`)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* Data */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Data da avaliação</label>
        <input
          type="date"
          value={dataAvaliacao}
          onChange={(e) => setDataAvaliacao(e.target.value)}
          required
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
        />
      </div>

      {/* Medidas Corporais */}
      <section>
        <h3 className="text-sm font-semibold text-navy-500 mb-3 pb-2 border-b border-gray-100">
          Medidas Corporais
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CAMPO_MEDIDAS.map(({ label, unit, key, step }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {label} <span className="text-gray-300">({unit})</span>
              </label>
              <input
                type="number"
                step={step}
                min="0"
                value={v(key)}
                onChange={set(key)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-300"
              />
            </div>
          ))}
        </div>

        {/* Calculados */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Calculado label="Altura (cm)"  value={alturaCm?.toFixed(1)}   unit="cm" />
          <Calculado label="Altura²"      value={alturaAoQuadrado?.toFixed(4)} unit="m²" />
          <Calculado
            label="IMC"
            value={imc?.toFixed(2)}
            unit="kg/m²"
            badge={imc != null ? { text: imcLabel(imc), color: imcClass(imc) } : undefined}
          />
          <Calculado
            label="RCE"
            value={rce?.toFixed(4)}
            badge={rce != null ? {
              text: rce < 0.5 ? 'Baixo risco' : rce < 0.6 ? 'Risco moderado' : 'Alto risco',
              color: rce < 0.5 ? 'text-emerald-600' : rce < 0.6 ? 'text-amber-500' : 'text-red-500',
            } : undefined}
          />
        </div>
      </section>

      {/* Testes Físicos */}
      <section>
        <h3 className="text-sm font-semibold text-navy-500 mb-3 pb-2 border-b border-gray-100">
          Testes de Aptidão Física
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CAMPO_TESTES.map(({ label, unit, key, step }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {label} <span className="text-gray-300">({unit})</span>
              </label>
              <input
                type="number"
                step={step}
                min="0"
                value={v(key)}
                onChange={set(key)}
                placeholder="—"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Provas de Natação */}
      <section>
        <h3 className="text-sm font-semibold text-navy-500 mb-3 pb-2 border-b border-gray-100">
          Provas de Natação
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {CAMPO_NATACAO.map(({ label, unit, key }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {label} <span className="text-gray-300">({unit})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={v(key)}
                onChange={set(key)}
                placeholder="00:00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Observações */}
      <section>
        <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          placeholder="Anotações adicionais sobre a avaliação..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 placeholder:text-gray-300 resize-none"
        />
      </section>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="bg-sky-400 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          {isPending ? 'Salvando...' : 'Salvar avaliação'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function Calculado({
  label, value, unit, badge,
}: {
  label: string
  value?: string
  unit?: string
  badge?: { text: string; color: string }
}) {
  return (
    <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2.5">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-base font-bold text-navy-500">
        {value ?? '—'} {value && unit && <span className="text-xs font-normal text-gray-400">{unit}</span>}
      </p>
      {badge && value && (
        <p className={`text-xs font-medium mt-0.5 ${badge.color}`}>{badge.text}</p>
      )}
    </div>
  )
}
