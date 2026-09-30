import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { ClipboardList, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// Dados da ficha preenchida mais recente que não têm coluna em `alunos`
// (lib/fichaCadastro.ts leva o resto — dados pessoais, endereço, responsáveis).
export type FichaDados = {
  id: string
  preenchido_em: string
  responsavel_assina: string | null
  p_cpf: string | null
  escola_nome_endereco: string | null
  serie_escolar: string | null
  condicao_medica: boolean | null
  condicao_medica_descricao: string | null
  tratamento_medico: boolean | null
  tratamento_medico_descricao: string | null
  alergia: boolean | null
  alergia_descricao: string | null
  autorizacao_medica: boolean | null
  praticou_modalidade: boolean | null
  interesse_eventos: boolean | null
  como_soube: string | null
  tem_bicicleta: boolean | null
  tamanho_camiseta: string | null
}

export const CAMPOS_FICHA_DADOS =
  'id, preenchido_em, responsavel_assina, p_cpf, escola_nome_endereco, serie_escolar, ' +
  'condicao_medica, condicao_medica_descricao, tratamento_medico, tratamento_medico_descricao, ' +
  'alergia, alergia_descricao, autorizacao_medica, praticou_modalidade, interesse_eventos, ' +
  'como_soube, tem_bicicleta, tamanho_camiseta'

const simNao = (v: boolean | null) => (v == null ? '—' : v ? 'Sim' : 'Não')

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="text-gray-800 mt-0.5">{children || '—'}</dd>
    </div>
  )
}

function Saude({ label, sim, descricao }: { label: string; sim: boolean | null; descricao: string | null }) {
  return (
    <div className={sim ? 'col-span-2 rounded-lg bg-red-50 px-3 py-2' : ''}>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="mt-0.5">
        {sim ? <Badge variant="red">Sim</Badge> : <span className="text-gray-800">{simNao(sim)}</span>}
        {sim && descricao && <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{descricao}</p>}
      </dd>
    </div>
  )
}

export default function FichaDadosCard({ ficha }: { ficha: FichaDados }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <ClipboardList size={16} className="text-sky-400" />
        <h2 className="text-sm font-semibold text-navy-500">Dados da ficha de inscrição</h2>
        <a
          href={`/fichas/${ficha.id}/imprimir`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-sky-500 hover:underline"
        >
          <Download size={12} /> Ficha completa
        </a>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Preenchida em {formatDate(ficha.preenchido_em)}
        {ficha.responsavel_assina ? ` por ${ficha.responsavel_assina}` : ''}
      </p>

      <h3 className="text-xs font-semibold text-gray-500 mb-2">Saúde</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
        <Saude label="Condição médica ou restrição física" sim={ficha.condicao_medica} descricao={ficha.condicao_medica_descricao} />
        <Saude label="Tratamento médico / medicação contínua" sim={ficha.tratamento_medico} descricao={ficha.tratamento_medico_descricao} />
        <Saude label="Alergia" sim={ficha.alergia} descricao={ficha.alergia_descricao} />
        <Item label="Autorização médica para o esporte">{simNao(ficha.autorizacao_medica)}</Item>
      </dl>

      <h3 className="text-xs font-semibold text-gray-500 mb-2">Documento e escola</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
        <Item label="CPF do atleta">{ficha.p_cpf}</Item>
        <Item label="Série / ano escolar">{ficha.serie_escolar}</Item>
        <div className="col-span-2"><Item label="Escola">{ficha.escola_nome_endereco}</Item></div>
      </dl>

      <h3 className="text-xs font-semibold text-gray-500 mb-2">Esporte e equipamentos</h3>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Item label="Já praticou alguma modalidade">{simNao(ficha.praticou_modalidade)}</Item>
        <Item label="Interesse em eventos e festivais">{simNao(ficha.interesse_eventos)}</Item>
        <Item label="Bicicleta em condições de uso">{simNao(ficha.tem_bicicleta)}</Item>
        <Item label="Tamanho da camiseta">{ficha.tamanho_camiseta}</Item>
        <div className="col-span-2"><Item label="Como soube do projeto">{ficha.como_soube}</Item></div>
      </dl>
    </Card>
  )
}
