import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import { ChevronLeft, User, School, Heart, Bike, UserCheck } from 'lucide-react'
import { formatDate, formatTelefone } from '@/lib/utils'
import StatusSelect from '../StatusSelect'
import type { CandidatoRow, UserRole } from '@/types/database'

function Row({ label, value }: { label: string; value?: string | null | boolean }) {
  if (value === null || value === undefined || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value)
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-xs text-gray-400 sm:w-52 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-navy-500 font-medium">{display}</dd>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <Icon size={15} className="text-sky-400" />
        <h3 className="text-sm font-semibold text-navy-500">{title}</h3>
      </div>
      <dl className="space-y-0">{children}</dl>
    </Card>
  )
}

export default async function CandidatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: pr } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'coach'].includes((pr?.role ?? '') as UserRole)) redirect('/dashboard')

  const { data: raw } = await supabase
    .from('candidatos')
    .select('*, turmas:turma_id ( nome )')
    .eq('id', id)
    .single()

  if (!raw) notFound()
  type CandidatoComTurma = CandidatoRow & { turmas: { nome: string } | null }
  const c = raw as CandidatoComTurma

  // Link para pré-preencher aluno
  const params_aluno = new URLSearchParams({
    nome:             c.nome,
    data_nascimento:  c.data_nascimento ?? '',
    sexo:             c.sexo ?? '',
    turma:            c.turma_id ?? '',
  })

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <Link href="/candidatos" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-navy-500 transition-colors mb-4">
        <ChevronLeft size={13} /> Candidatos
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <PageHeader
          title={c.nome}
          subtitle={`${c.turmas?.nome ?? 'Sem turma'} · Inscrito em ${formatDate(c.created_at.slice(0, 10))}`}
        />
        <div className="flex flex-col gap-2 flex-shrink-0">
          <StatusSelect candidatoId={c.id} currentStatus={c.status} />
          {(c.status === 'sorteado') && (
            <Link
              href={`/alunos/novo?${params_aluno.toString()}`}
              className="text-xs text-center font-semibold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-2 rounded-lg transition-colors"
            >
              + Converter em atleta
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Section icon={User} title="Dados do Atleta">
          <Row label="Nome completo" value={c.nome} />
          <Row label="Data de nascimento" value={c.data_nascimento ? formatDate(c.data_nascimento) : null} />
          <Row label="Sexo biológico" value={c.sexo === 'M' ? 'Masculino' : c.sexo === 'F' ? 'Feminino' : c.sexo} />
          <Row label="CPF" value={c.cpf} />
          <Row label="Endereço" value={c.endereco_completo} />
          <Row label="Turma pretendida" value={c.turmas?.nome} />
          <Row label="Tamanho da camiseta" value={c.tamanho_camiseta} />
          <Row label="Possui bicicleta" value={c.tem_bicicleta} />
        </Section>

        <Section icon={School} title="Dados Escolares">
          <Row label="Escola" value={c.escola_nome_endereco} />
          <Row label="Série/Ano" value={c.serie_escolar} />
        </Section>

        <Section icon={Heart} title="Saúde">
          <Row label="Condição médica" value={c.condicao_medica} />
          {c.condicao_medica && <Row label="Descrição" value={c.condicao_medica_descricao} />}
          <Row label="Tratamento médico" value={c.tratamento_medico} />
          {c.tratamento_medico && <Row label="Descrição" value={c.tratamento_medico_descricao} />}
          <Row label="Alergia" value={c.alergia} />
          {c.alergia && <Row label="Descrição da alergia" value={c.alergia_descricao} />}
          <Row label="Autorização médica" value={c.autorizacao_medica} />
        </Section>

        <Section icon={Bike} title="Esporte e Interesse">
          <Row label="Já praticou triathlon/modalidades" value={c.praticou_modalidade} />
          <Row label="Interesse em eventos" value={c.interesse_eventos} />
          <Row label="Como soube do projeto" value={c.como_soube} />
        </Section>

        <Section icon={UserCheck} title="Responsável Legal">
          <Row label="Nome" value={c.responsavel_nome} />
          <Row label="Telefone / WhatsApp" value={formatTelefone(c.responsavel_telefone)} />
          <Row label="E-mail do responsável" value={c.responsavel_email} />
          <Row label="E-mail de inscrição" value={c.email_responsavel} />
        </Section>

        {c.observacoes_internas && (
          <Card>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Observações internas</h3>
            <p className="text-sm text-navy-500">{c.observacoes_internas}</p>
          </Card>
        )}
      </div>
    </div>
  )
}
