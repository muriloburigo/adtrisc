import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { COR_DESEMPENHO } from '@/components/avaliacoes/ProespBadges'
import {
  SAUDE, DESEMPENHO, RCE_CORTE, EM_CM, IDADE_MIN, IDADE_MAX,
  type NivelDesempenho, type Quad,
} from '@/lib/proesp'
import type { SexoEnum } from '@/types/database'

const MANUAL_URL = 'https://lume.ufrgs.br/handle/10183/217804'

const NIVEIS: NivelDesempenho[] = ['Fraco', 'Razoável', 'Bom', 'Muito bom', 'Excelência']

// Ordem e rótulos como na página da avaliação. Medicine ball e salto aparecem
// em metros (como o sistema mostra), embora o manual use cm.
const TESTES: { campo: string; nome: string; unidade: string; casas: number }[] = [
  { campo: 'imc',                    nome: 'IMC',                      unidade: 'kg/m²', casas: 1 },
  { campo: 'resistencia_6min',       nome: 'Resistência 6 min',        unidade: 'm',     casas: 0 },
  { campo: 'sentar_alcancar',        nome: 'Sentar e alcançar',        unidade: 'cm',    casas: 1 },
  { campo: 'forca_abdominal',        nome: 'Abdominal (1 min)',        unidade: 'rep',   casas: 0 },
  { campo: 'arremesso_medicineball', nome: 'Arremesso medicine ball',  unidade: 'm',     casas: 2 },
  { campo: 'salto_horizontal',       nome: 'Salto horizontal',         unidade: 'm',     casas: 2 },
  { campo: 'agilidade',              nome: 'Agilidade (quadrado)',     unidade: 's',     casas: 2 },
  { campo: 'corrida_20m',            nome: 'Corrida 20 m',             unidade: 's',     casas: 2 },
]

const IDADES = Array.from({ length: IDADE_MAX - IDADE_MIN + 1 }, (_, i) => IDADE_MIN + i)

function fmt(campo: string, v: number, casas: number) {
  const valor = EM_CM.has(campo) ? v / 100 : v
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}

// Faixa de cada nível, na mesma lógica de nivel() em lib/proesp.ts.
function faixas(campo: string, sentido: 'maior' | 'menor', q: Quad, casas: number): string[] {
  const f = (v: number) => fmt(campo, v, casas)
  if (sentido === 'maior') {
    return [`< ${f(q[0])}`, `${f(q[0])} – ${f(q[1])}`, `${f(q[1])} – ${f(q[2])}`, `${f(q[2])} – ${f(q[3])}`, `≥ ${f(q[3])}`]
  }
  // Tempo: quanto menor, melhor. q = limites superiores de [Excelência, Muito bom, Bom, Razoável].
  return [`> ${f(q[3])}`, `${f(q[2])} – ${f(q[3])}`, `${f(q[1])} – ${f(q[2])}`, `${f(q[0])} – ${f(q[1])}`, `≤ ${f(q[0])}`]
}

export default async function ReferenciaProespPage({
  searchParams,
}: {
  searchParams: Promise<{ sexo?: string; idade?: string }>
}) {
  const sp = await searchParams
  const sexo: SexoEnum = sp.sexo === 'F' ? 'F' : 'M'
  const idadeParam = Number(sp.idade)
  const idade = Number.isInteger(idadeParam) && idadeParam >= IDADE_MIN && idadeParam <= IDADE_MAX ? idadeParam : null
  const href = (s: SexoEnum) => `/avaliacoes/referencia?sexo=${s}${idade != null ? `&idade=${idade}` : ''}`

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <BackButton />
      <PageHeader
        title="Referência PROESP-Br"
        subtitle="Tabelas usadas nos selos de classificação da avaliação física"
      />

      <Card className="mb-4">
        <div className="text-sm text-gray-700 space-y-3">
          <p>
            Os selos que aparecem abaixo dos resultados da avaliação (Fraco, Razoável, Bom, Muito bom, Excelência e
            Zona de risco) seguem o <strong>Projeto Esporte Brasil — Manual de medidas, testes e avaliações</strong>,
            versão 2021 (Gaya, A. R.; Gaya, A.; Pedretti, A.; Mello, J. — UFRGS).
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Nível de desempenho</strong> — normas de desempenho motor por sexo e idade.
            </li>
            <li>
              <strong>Zona de saúde</strong> — pontos de corte da aptidão física relacionada à saúde. Fora do corte o
              atleta está em <Badge variant="red">Zona de risco</Badge>.
            </li>
            <li>
              A idade é a do atleta <strong>na data da avaliação</strong> (anos completos), de {IDADE_MIN} a {IDADE_MAX} anos.
              É preciso ter sexo e data de nascimento no cadastro.
            </li>
          </ul>
          <a href={MANUAL_URL} target="_blank" rel="noopener noreferrer" className="inline-block text-sky-500 hover:underline">
            Abrir o manual completo (repositório da UFRGS) ↗
          </a>
        </div>
      </Card>

      <div className="flex items-center gap-2 mb-4">
        {(['M', 'F'] as SexoEnum[]).map((s) => (
          <Link
            key={s}
            href={href(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              s === sexo ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'M' ? 'Masculino' : 'Feminino'}
          </Link>
        ))}
        {idade != null && (
          <span className="text-xs text-gray-400 ml-2">Linha destacada: {idade} anos</span>
        )}
      </div>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-1">RCE — relação cintura/estatura</h3>
        <p className="text-sm text-gray-700">
          Zona de risco acima de {RCE_CORTE.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, igual para todas as idades e ambos os sexos.
        </p>
      </Card>

      {TESTES.map(({ campo, nome, unidade, casas }) => {
        const saude = SAUDE[campo]
        const desempenho = DESEMPENHO[campo]
        return (
          <Card key={campo} className="mb-4">
            <h3 className="text-sm font-semibold text-navy-500">{nome} <span className="font-normal text-gray-400">({unidade})</span></h3>
            <p className="text-xs text-gray-400 mb-3">
              {desempenho && (desempenho.sentido === 'menor' ? 'Tempo: quanto menor, melhor.' : 'Quanto maior, melhor.')}
              {saude && ` Zona de risco ${saude.sentido === 'acima' ? 'acima' : 'abaixo'} do ponto de corte.`}
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="text-left font-medium px-3 py-2">Idade</th>
                    {saude && <th className="text-center font-medium px-3 py-2">Corte de saúde</th>}
                    {desempenho && NIVEIS.map((n) => (
                      <th key={n} className="text-center font-medium px-2 py-2">
                        <Badge variant={COR_DESEMPENHO[n]}>{n}</Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {IDADES.map((i) => {
                    const idx = i - IDADE_MIN
                    const destaque = i === idade
                    return (
                      <tr key={i} className={destaque ? 'bg-sky-50 font-semibold text-navy-500' : 'text-gray-700'}>
                        <td className="px-3 py-1.5 whitespace-nowrap">{i} anos</td>
                        {saude && (
                          <td className="text-center px-3 py-1.5 whitespace-nowrap">
                            {saude.sentido === 'acima' ? '≤ ' : '≥ '}{fmt(campo, saude.corte[sexo][idx], casas)}
                          </td>
                        )}
                        {desempenho && faixas(campo, desempenho.sentido, desempenho.limites[sexo][idx], casas).map((f, j) => (
                          <td key={j} className="text-center px-2 py-1.5 whitespace-nowrap">{f}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-navy-500 mb-2">Observações</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li>A coluna &quot;Corte de saúde&quot; mostra a faixa da <strong>zona saudável</strong>.</li>
          <li>
            Nas faixas de desempenho, o limite inferior pertence ao nível (ex.: em &quot;30 – 36&quot;, 30 conta, 36 já é o
            nível seguinte). Nos testes de tempo, o limite superior pertence ao nível.
          </li>
          <li>
            O manual traz o arremesso de medicine ball e o salto horizontal em centímetros. Aqui eles aparecem em
            metros, como no resto do sistema.
          </li>
          <li>
            Correções de digitação do PDF: a Excelência do salto aparece com &quot;≤&quot; (o correto é &quot;≥&quot;), e a
            Excelência feminina do abdominal e da flexibilidade repete o topo do Muito bom (usamos o valor seguinte,
            como nas tabelas masculinas).
          </li>
          <li>
            Dabonneville 5&apos;, ciclismo 2 km e natação não têm classificação PROESP-Br. A maturação usa a equação
            de Mirwald (2002).
          </li>
        </ul>
      </Card>
    </div>
  )
}
