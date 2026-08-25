'use client'

import { useState, useTransition } from 'react'
import AvatarUpload from '@/components/ui/AvatarUpload'

type Turma = { id: string; nome: string }

type AlunoData = {
  turma_id?: string | null
  nome?: string | null
  telefone?: string | null
  sexo?: string | null
  data_nascimento?: string | null
  rua?: string | null
  numero?: string | null
  bairro?: string | null
  cep?: string | null
  cidade?: string | null
  observacoes?: string | null
  status?: string | null
  foto_url?: string | null
}

type RespData = {
  nome?: string | null
  cpf?: string | null
  rg?: string | null
  email?: string | null
  telefone?: string | null
}

export default function AlunoForm({
  action,
  aluno,
  turmas,
  mae,
  pai,
  submitLabel = 'Salvar',
  showStatus = false,
  defaultTurmaId,
}: {
  action: (fd: FormData) => Promise<{ error?: string } | void>
  aluno?: AlunoData
  turmas: Turma[]
  mae?: RespData
  pai?: RespData
  submitLabel?: string
  showStatus?: boolean
  defaultTurmaId?: string
}) {
  const [pending, startTransition] = useTransition()
  const [fotoUrl, setFotoUrl] = useState(aluno?.foto_url ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await action(fd)
      if (res?.error) setError(res.error)
    })
  }

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const sectionClass = 'space-y-4 border border-gray-100 rounded-2xl p-5 mb-6'
  const sectionTitleClass = 'text-sm font-semibold text-navy-500 mb-4 pb-2 border-b border-gray-100'

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      <input type="hidden" name="foto_url" value={fotoUrl ?? ''} />

      {/* Foto */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Foto</h3>
        <AvatarUpload
          folder="alunos"
          currentUrl={aluno?.foto_url}
          name={aluno?.nome ?? 'A'}
          onUpload={(url) => setFotoUrl(url)}
        />
      </div>

      {/* Dados do atleta */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Dados do Atleta</h3>

        <div>
          <label className={labelClass}>Nome completo *</label>
          <input
            name="nome"
            required
            defaultValue={aluno?.nome ?? ''}
            placeholder="Nome completo"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Sexo biológico</label>
            <select name="sexo" defaultValue={aluno?.sexo ?? ''} className={inputClass}>
              <option value="">Selecionar</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Data de nascimento</label>
            <input
              name="data_nascimento"
              type="date"
              defaultValue={aluno?.data_nascimento ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Turma</label>
            <select name="turma_id" defaultValue={aluno?.turma_id ?? defaultTurmaId ?? ''} className={inputClass}>
              <option value="">Sem turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Telefone / WhatsApp</label>
            <input
              name="telefone"
              type="tel"
              defaultValue={aluno?.telefone ?? ''}
              placeholder="(48) 99999-9999"
              className={inputClass}
            />
          </div>
        </div>

        {showStatus && (
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue={aluno?.status ?? 'ativo'} className={inputClass}>
              <option value="ativo">Ativo (matriculado e frequentando)</option>
              <option value="inativo">Inativo (temporariamente afastado)</option>
              <option value="desligado">Desligado (perdeu a vaga)</option>
            </select>
          </div>
        )}
      </div>

      {/* Endereço */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Endereço</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Rua / Av.</label>
            <input name="rua" defaultValue={aluno?.rua ?? ''} placeholder="Rua das Flores" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input name="numero" defaultValue={aluno?.numero ?? ''} placeholder="123" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Bairro</label>
            <input name="bairro" defaultValue={aluno?.bairro ?? ''} placeholder="Centro" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CEP</label>
            <input name="cep" defaultValue={aluno?.cep ?? ''} placeholder="88000-000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input name="cidade" defaultValue={aluno?.cidade ?? ''} placeholder="Florianópolis" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Responsável - Mãe */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Responsável — Mãe / Feminino</h3>
        <ResponsavelFields prefix="mae" data={mae} inputClass={inputClass} labelClass={labelClass} />
      </div>

      {/* Responsável - Pai */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Responsável — Pai / Masculino</h3>
        <ResponsavelFields prefix="pai" data={pai} inputClass={inputClass} labelClass={labelClass} />
      </div>

      {/* Observações */}
      <div className={sectionClass}>
        <h3 className={sectionTitleClass}>Observações</h3>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={aluno?.observacoes ?? ''}
          placeholder="Informações adicionais, alergias, necessidades especiais…"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-sky-400 hover:bg-sky-500 text-white font-semibold rounded-xl py-3 transition-colors disabled:opacity-60"
      >
        {pending ? 'Salvando…' : submitLabel}
      </button>
    </form>
  )
}

function ResponsavelFields({
  prefix,
  data,
  inputClass,
  labelClass,
}: {
  prefix: string
  data?: RespData
  inputClass: string
  labelClass: string
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Nome</label>
          <input name={`${prefix}_nome`} defaultValue={data?.nome ?? ''} placeholder="Nome do responsável" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Telefone / WhatsApp</label>
          <input name={`${prefix}_telefone`} type="tel" defaultValue={data?.telefone ?? ''} placeholder="(48) 99999-9999" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>E-mail</label>
          <input name={`${prefix}_email`} type="email" defaultValue={data?.email ?? ''} placeholder="email@exemplo.com" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>CPF</label>
          <input name={`${prefix}_cpf`} defaultValue={data?.cpf ?? ''} placeholder="000.000.000-00" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>RG</label>
        <input name={`${prefix}_rg`} defaultValue={data?.rg ?? ''} placeholder="0000000" className={inputClass} />
      </div>
    </div>
  )
}
