import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Shuffle, ShieldCheck, ListOrdered, CheckCircle2, HelpCircle, Clock } from 'lucide-react'

const UPDATED = '06 de maio de 2026'

export default function RegrasSorteioPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ background: '#0C143D' }} className="sticky top-0 z-10 shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 bg-white rounded-lg overflow-hidden flex-shrink-0">
            <Image src="/logo-white.jpg" alt="ADTRISC" width={36} height={36} className="object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none">ADTRISC</p>
            <p className="text-xs mt-0.5" style={{ color: '#2AABE1' }}>Regras do Sorteio de Vagas</p>
          </div>
          <Link
            href="/inscricao"
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Inscrição
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Regras e Funcionamento do Sorteio de Vagas
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Última atualização: {UPDATED} · ADTRISC — Associação Desportiva Triatlética de Santa Catarina
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          {/* 1 */}
          <Section icon={HelpCircle} title="1. Por que existe o sorteio?">
            <p>
              A <strong>ADTRISC</strong> tem um número limitado de vagas por turma para garantir
              a qualidade do atendimento e o acompanhamento individualizado de cada atleta.
              Quando a procura supera as vagas disponíveis, o preenchimento das vagas é decidido
              por <strong>sorteio público</strong> — e não por ordem de chegada, renda ou qualquer
              outro critério que possa gerar vantagem para determinados participantes.
            </p>
            <p className="mt-2">
              O sorteio assegura <strong>igualdade de oportunidades</strong> para todas as famílias
              interessadas.
            </p>
          </Section>

          {/* 2 */}
          <Section icon={ListOrdered} title="2. Quem pode se inscrever?">
            <p className="mb-3">
              Qualquer pessoa pode se inscrever para participar do sorteio de uma turma, desde que:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li>O formulário de inscrição seja preenchido de forma <strong>completa e verídica</strong>.</li>
              <li>O responsável legal aceite os <strong>termos de participação</strong> ao final do formulário.</li>
            </ul>
            <Callout type="info">
              O formulário de inscrição é <strong>permanentemente público</strong> — não há prazo de encerramento.
              Novos candidatos podem se inscrever a qualquer momento e participarão do próximo sorteio.
              Inscrições duplicadas para a mesma turma serão desconsideradas.
            </Callout>
          </Section>

          {/* 3 */}
          <Section icon={Clock} title="3. Fluxo completo do processo">
            <ol className="space-y-4">
              {[
                {
                  n: '01',
                  title: 'Formulário sempre aberto',
                  desc: 'O formulário público está permanentemente disponível em adtrisc.vercel.app/inscricao. Qualquer família pode se inscrever a qualquer momento para uma turma com vagas.',
                },
                {
                  n: '02',
                  title: 'Fila de candidatos',
                  desc: 'Todas as novas inscrições recebem o status "Pendente". Candidatos que participaram de sorteios anteriores e não foram contemplados permanecem na "Lista de Espera". Ambos os grupos concorrem juntos no próximo sorteio.',
                },
                {
                  n: '03',
                  title: 'Realização do sorteio',
                  desc: 'Quando a ADTRISC decide realizar um sorteio, o sistema reúne automaticamente todos os candidatos Pendentes e em Lista de Espera para aquela turma. O processo é automático, imparcial e registrado para auditoria.',
                },
                {
                  n: '04',
                  title: 'Divulgação do resultado',
                  desc: 'Os responsáveis são comunicados. Os sorteados recebem orientações para efetivar a matrícula. Os não contemplados passam automaticamente para a Lista de Espera e participarão do próximo sorteio sem precisar se inscrever novamente.',
                },
                {
                  n: '05',
                  title: 'Lista de espera contínua',
                  desc: 'Candidatos em lista de espera são automaticamente incluídos em todos os sorteios seguintes para a mesma turma. Novas inscrições de outros candidatos também são incluídas. O ciclo se repete conforme novos sorteios são realizados.',
                },
                {
                  n: '06',
                  title: 'Efetivação da matrícula',
                  desc: 'Os sorteados têm um prazo para confirmar a matrícula. Vagas não confirmadas dentro do prazo podem ser ofertadas aos próximos da lista de espera.',
                },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex gap-4">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white mt-0.5"
                    style={{ background: '#0C143D' }}
                  >
                    {n}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{title}</p>
                    <p className="mt-0.5 text-gray-600">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>

          {/* 4 */}
          <Section icon={Shuffle} title="4. Como o sorteio é realizado?">
            <p className="mb-3">
              O sorteio é realizado pelo <strong>sistema digital da ADTRISC</strong>, de forma
              totalmente automatizada, sem interferência humana no resultado. O processo segue
              estas etapas:
            </p>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>
                O sistema coleta todos os candidatos com status <em>Pendente</em> (novas inscrições)
                e <em>Lista de Espera</em> (não contemplados em sorteios anteriores) para aquela
                turma, em ordem de inscrição (por data/hora de cadastro).
              </li>
              <li>
                Uma <strong>semente aleatória</strong> (seed) é gerada no momento exato do
                sorteio, usando criptografia de nível de sistema operacional.
              </li>
              <li>
                A lista é embaralhada usando o algoritmo <strong>Fisher-Yates</strong> com
                o gerador pseudo-aleatório <strong>Mulberry32</strong>, inicializado pela semente.
              </li>
              <li>
                Os primeiros <em>N</em> candidatos da lista embaralhada (onde <em>N</em> é
                a capacidade da turma) são marcados como <strong>Sorteados</strong>. Os demais
                são marcados como <strong>Não sorteados</strong>.
              </li>
              <li>
                Todos os dados do sorteio — semente, lista original, resultado e identidade
                de quem executou — são <strong>gravados permanentemente</strong> no sistema.
              </li>
            </ol>

            <Callout type="info" className="mt-4">
              <strong>O que é a semente (seed)?</strong> É um valor único gerado aleatoriamente
              que "inicializa" o embaralhamento. Dado o mesmo seed e a mesma lista de candidatos,
              o resultado do sorteio será sempre idêntico — isso permite que qualquer pessoa
              verifique de forma independente se o sorteio foi realizado corretamente.
            </Callout>
          </Section>

          {/* 5 */}
          <Section icon={ShieldCheck} title="5. Auditabilidade e transparência">
            <p className="mb-3">
              A ADTRISC acredita que um processo justo precisa ser verificável. Por isso, cada
              sorteio gera um <strong>registro público de auditoria</strong> que contém:
            </p>
            <ul className="space-y-2">
              {[
                ['Identificação do sorteio', 'ID único que identifica cada sorteio realizado.'],
                ['Data e hora exatas', 'Registro do momento preciso em que o sorteio foi executado.'],
                ['Responsável', 'Nome do administrador que iniciou o processo.'],
                ['Semente (seed)', 'Valor criptográfico que gerou o embaralhamento.'],
                ['Snapshot dos candidatos', 'Lista completa e ordenada de todos os candidatos que participaram, na ordem em que se inscreveram.'],
                ['Resultado ranqueado', 'Lista final com a posição de sorteio de cada candidato e o respectivo status (sorteado ou não).'],
                ['Código do algoritmo', 'O código exato utilizado no embaralhamento, disponível para reprodução independente.'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>{title}:</strong> {desc}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4">
              Com esses dados, qualquer pessoa com conhecimento básico de programação pode
              reproduzir o sorteio de forma independente e confirmar que o resultado foi
              gerado conforme as regras.
            </p>
          </Section>

          {/* 6 */}
          <Section icon={CheckCircle2} title="6. O que acontece após o sorteio?">
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-700 mb-1">Se o(a) atleta for sorteado(a)</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-800 text-sm">
                  <li>O responsável é comunicado pela ADTRISC com as instruções de matrícula.</li>
                  <li>Haverá um prazo definido para efetivar a matrícula e garantir a vaga.</li>
                  <li>A vaga é confirmada somente após a entrega da documentação exigida e a conclusão do processo de matrícula.</li>
                </ul>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="font-semibold text-indigo-700 mb-1">Se o(a) atleta não for sorteado(a) — Lista de Espera</p>
                <ul className="list-disc list-inside space-y-1 text-indigo-800 text-sm">
                  <li>O responsável é comunicado sobre o resultado.</li>
                  <li>O(a) atleta passa automaticamente para a <strong>Lista de Espera</strong> da turma.</li>
                  <li>Não é necessário se inscrever novamente — a candidatura é mantida e incluída automaticamente em todos os sorteios futuros da mesma turma.</li>
                  <li>Vagas que não forem confirmadas pelos sorteados dentro do prazo serão oferecidas aos próximos da lista de espera, por ordem de posição do sorteio.</li>
                </ul>
              </div>
            </div>
          </Section>

          {/* 7 */}
          <Section icon={HelpCircle} title="7. Perguntas frequentes">
            <div className="space-y-5">
              {[
                {
                  q: 'A ordem de inscrição influencia o resultado do sorteio?',
                  a: 'Não. Tanto novos candidatos quanto os que estão na lista de espera têm exatamente a mesma chance de ser sorteados. A data de inscrição é usada apenas para registrar o snapshot, não para definir prioridade.',
                },
                {
                  q: 'Preciso me inscrever novamente se não fui sorteado(a)?',
                  a: 'Não. Candidatos não contemplados passam automaticamente para a Lista de Espera e participam de todos os sorteios seguintes para a mesma turma sem nenhuma ação adicional. A inscrição é mantida até que o(a) atleta seja sorteado(a) ou solicite a remoção.',
                },
                {
                  q: 'Candidatos novos e da lista de espera concorrem em igualdade?',
                  a: 'Sim. No momento do sorteio, todos os candidatos — novos (status Pendente) e em espera (status Lista de Espera) — são reunidos em um único pool e embaralhados com o mesmo algoritmo. Não há prioridade para quem está esperando há mais tempo.',
                },
                {
                  q: 'Posso inscrever meu filho(a) em mais de uma turma?',
                  a: 'Cada formulário de inscrição é vinculado a uma turma específica. É possível submeter inscrições separadas para turmas diferentes.',
                },
                {
                  q: 'O que acontece se eu preencher os dados de forma errada?',
                  a: 'A inscrição com dados incorretos pode ser desclassificada no momento da matrícula, caso as informações não sejam confirmadas. Preencha sempre com atenção e veracidade.',
                },
                {
                  q: 'Posso contestar o resultado do sorteio?',
                  a: 'Sim. O registro de auditoria está disponível e pode ser verificado de forma independente. Entre em contato com a ADTRISC e solicite o acesso ao registro do sorteio da turma. Com a seed e a lista de candidatos, qualquer pessoa pode reproduzir e confirmar o resultado.',
                },
                {
                  q: 'O sorteio pode ser repetido?',
                  a: 'Apenas em caso de erro técnico comprovado ou decisão justificada da diretoria da ADTRISC, com comunicado formal a todos os inscritos. Todo sorteio realizado — inclusive eventuais re-sorteios — fica registrado no histórico de auditoria.',
                },
                {
                  q: 'Como saber se a inscrição foi registrada com sucesso?',
                  a: 'Após o envio do formulário, uma tela de confirmação é exibida. Guarde o nome do(a) atleta e a turma inscrita. Em caso de dúvida, entre em contato com a ADTRISC informando o nome e a turma selecionada.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-l-2 pl-4" style={{ borderColor: '#2AABE1' }}>
                  <p className="font-semibold text-gray-900 mb-1">{q}</p>
                  <p className="text-gray-600">{a}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* 8 */}
          <Section icon={ShieldCheck} title="8. Contato">
            <p>
              Dúvidas sobre o processo de inscrição ou sorteio? Entre em contato com a ADTRISC:
            </p>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg">
              <p className="font-semibold text-gray-800">ADTRISC — Associação Desportiva Triatlética de Santa Catarina</p>
              <p className="mt-1">
                <strong>E-mail:</strong>{' '}
                <a href="mailto:contato@adtrisc.com.br" className="text-sky-500 hover:underline">
                  contato@adtrisc.com.br
                </a>
              </p>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADTRISC — Associação Desportiva Triatlética de Santa Catarina
          </p>
          <Link
            href="/inscricao"
            className="text-xs font-medium text-sky-500 hover:text-sky-600 flex items-center gap-1"
          >
            <ChevronLeft size={13} /> Voltar à inscrição
          </Link>
        </div>
      </main>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3 pb-2 border-b-2 flex items-center gap-2"
        style={{ color: '#0C143D', borderColor: '#2AABE1' }}>
        <Icon size={16} style={{ color: '#2AABE1' }} />
        {title}
      </h2>
      {children}
    </section>
  )
}

function Callout({ type, children, className = '' }: { type: 'info' | 'warning'; children: React.ReactNode; className?: string }) {
  const styles = {
    info: 'bg-sky-50 border-sky-200 text-sky-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[type]} ${className}`}>
      {children}
    </div>
  )
}
