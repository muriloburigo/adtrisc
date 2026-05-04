'use client'

import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import type { Database, AlunoStatus } from '@/types/database'

type Aluno = Database['public']['Tables']['alunos']['Row']
type Turma = { id: string; nome: string }
type Responsavel = Database['public']['Tables']['responsaveis']['Row']

const STATUS_OPTIONS: { value: AlunoStatus; label: string }[] = [
  { value: 'ativo',    label: 'Ativo' },
  { value: 'inativo',  label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' },
]

function ResponsavelSection({
  prefix,
  title,
  data,
}: {
  prefix: 'mae' | 'pai'
  title: string
  data?: Responsavel
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Input label="Nome completo" name={`${prefix}_nome`} defaultValue={data?.nome} placeholder="Nome do responsável" />
        </div>
        <Input label="CPF" name={`${prefix}_cpf`} defaultValue={data?.cpf ?? ''} placeholder="000.000.000-00" />
        <Input label="RG" name={`${prefix}_rg`} defaultValue={data?.rg ?? ''} placeholder="0000000" />
        <Input label="E-mail" name={`${prefix}_email`} type="email" defaultValue={data?.email ?? ''} placeholder="email@exemplo.com" />
        <Input label="Telefone" name={`${prefix}_telefone`} defaultValue={data?.telefone ?? ''} placeholder="(48) 99999-9999" />
      </div>
    </div>
  )
}

async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string } | null> {
  const clean = cep.replace(/\D/g, '')
  if (clean.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
  const data = await res.json()
  if (data.erro) return null
  return data
}

export default function AlunoForm({
  action,
  aluno,
  turmas,
  mae,
  pai,
  submitLabel = 'Salvar',
}: {
  action: (formData: FormData) => Promise<void>
  aluno?: Aluno
  turmas: Turma[]
  mae?: Responsavel
  pai?: Responsavel
  submitLabel?: string
}) {
  const [cep, setCep] = useState(aluno?.cep ?? '')
  const [rua, setRua] = useState(aluno?.rua ?? '')
  const [bairro, setBairro] = useState(aluno?.bairro ?? '')
  const [cidade, setCidade] = useState(aluno?.cidade ?? '')
  const [buscandoCep, setBuscandoCep] = useState(false)

  async function handleCepBlur() {
    if (cep.replace(/\D/g, '').length !== 8) return
    setBuscandoCep(true)
    const dados = await buscarCep(cep)
    if (dados) {
      setRua(dados.logradouro)
      setBairro(dados.bairro)
      setCidade(dados.localidade)
    }
    setBuscandoCep(false)
  }

  return (
    <form action={action} className="space-y-8">
      {/* Dados pessoais */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wide">Dados do Participante</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input label="Nome completo" name="nome" defaultValue={aluno?.nome} placeholder="Nome do aluno" required />
          </div>

          <Select
            label="Turma"
            name="turma_id"
            defaultValue={aluno?.turma_id ?? ''}
            placeholder="Selecione a turma..."
            options={turmas.map((t) => ({ value: t.id, label: t.nome }))}
            required
          />

          <Input label="Telefone" name="telefone" defaultValue={aluno?.telefone ?? ''} placeholder="(48) 99999-9999" />

          <Select
            label="Sexo"
            name="sexo"
            defaultValue={aluno?.sexo ?? ''}
            placeholder="Selecione..."
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
              { value: 'outro', label: 'Outro' },
            ]}
          />

          <Input label="Data de nascimento" name="data_nascimento" type="date" defaultValue={aluno?.data_nascimento ?? ''} />

          {aluno && (
            <Select
              label="Status"
              name="status"
              defaultValue={aluno.status}
              options={STATUS_OPTIONS}
              required
            />
          )}
        </div>
      </div>

      {/* Endereço */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-navy-500 uppercase tracking-wide">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="CEP"
            name="cep"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            hint={buscandoCep ? 'Buscando...' : undefined}
          />

          <div className="md:col-span-2">
            <Input
              label="Rua"
              name="rua"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              placeholder="Nome da rua"
            />
          </div>

          <Input label="Número" name="numero" defaultValue={aluno?.numero ?? ''} placeholder="123" />

          <Input
            label="Bairro"
            name="bairro"
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
            placeholder="Nome do bairro"
          />

          <Input
            label="Cidade"
            name="cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Nome da cidade"
          />
        </div>
      </div>

      {/* Responsáveis */}
      <ResponsavelSection prefix="mae" title="Mãe" data={mae} />
      <ResponsavelSection prefix="pai" title="Pai" data={pai} />

      {/* Observações */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Observações</label>
        <textarea
          name="observacoes"
          defaultValue={aluno?.observacoes ?? ''}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
          placeholder="Informações de saúde, restrições, observações gerais..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="secondary" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
