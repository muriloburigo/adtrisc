import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const UPDATED = '06 de maio de 2026 (rev. 3)'

export default function PoliticaPage() {
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
            <p className="text-xs mt-0.5" style={{ color: '#2AABE1' }}>Política de Privacidade e LGPD</p>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} /> Voltar ao login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Última atualização: {UPDATED} · Vigência: imediata
          </p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          {/* 1 */}
          <Section title="1. Quem somos">
            <p>
              A <strong>ADTRISC — Associação Desportiva Triatlética de Santa Catarina</strong>{' '}
              é a responsável pelo tratamento dos dados pessoais coletados por meio deste sistema
              de gestão da escolinha de triathlon (&quot;Sistema&quot;).
            </p>
            <p className="mt-2">
              Este documento descreve como coletamos, utilizamos, armazenamos e protegemos os
              dados pessoais de atletas, responsáveis legais, treinadores(as) e administradores(as),
              em conformidade com a{' '}
              <strong>Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018)</strong>.
            </p>
          </Section>

          {/* 2 */}
          <Section title="2. Dados que coletamos">
            <p className="mb-3">O Sistema coleta as seguintes categorias de dados pessoais:</p>

            <SubSection title="Atletas">
              <ul className="list-disc list-inside space-y-1">
                <li>Nome completo, data de nascimento, sexo e RG/CPF</li>
                <li>Endereço residencial (rua, número, bairro, cidade, CEP)</li>
                <li>Telefone de contato</li>
                <li>Turma e status de matrícula</li>
                <li>Registros de presença nas aulas</li>
                <li>Medidas corporais e resultados de avaliações físicas (massa corporal, estatura,
                  IMC, RCE, testes de aptidão física e tempos em provas de natação) utilizados para
                  acompanhamento do desenvolvimento esportivo</li>
                <li>
                  <strong>Foto de perfil</strong> — imagem fornecida voluntariamente por staff
                  autorizado para identificação visual no Sistema; não é obrigatória e pode ser
                  removida a qualquer momento
                </li>
              </ul>
            </SubSection>

            <SubSection title="Responsáveis legais">
              <ul className="list-disc list-inside space-y-1">
                <li>Nome completo, CPF e RG</li>
                <li>E-mail e telefone de contato</li>
                <li>Grau de parentesco com o/a atleta</li>
              </ul>
            </SubSection>

            <SubSection title="Candidatos ao processo seletivo">
              <ul className="list-disc list-inside space-y-1">
                <li>Nome completo, data de nascimento, sexo e CPF</li>
                <li>Endereço completo</li>
                <li>Escola, endereço escolar e série</li>
                <li>E-mail, nome e telefone do responsável legal</li>
                <li>
                  <strong>Dados de saúde (dados sensíveis — Art. 11 LGPD):</strong>{' '}
                  existência de condição médica, tratamento médico em curso e alergias,
                  coletados exclusivamente para avaliação de aptidão e segurança na prática esportiva,
                  com consentimento expresso do responsável legal no ato da inscrição
                </li>
                <li>Autorização médica para prática de atividade física</li>
                <li>Histórico de prática esportiva e interesse em eventos</li>
                <li>Como soube da ADTRISC, posse de bicicleta e tamanho de camiseta</li>
                <li>
                  Status no processo seletivo: <em>Pendente</em> (aguardando sorteio),{' '}
                  <em>Sorteado(a)</em> (contemplado no sorteio), <em>Lista de Espera</em> (não
                  contemplado no sorteio mais recente, mas mantido automaticamente para participar
                  de sorteios futuros) ou <em>Convertido(a)</em> (matrícula efetivada)
                </li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">
                <strong>Nota sobre lista de espera:</strong> o formulário de inscrição é permanentemente
                público e candidatos não contemplados em um sorteio são automaticamente incluídos na
                lista de espera para sorteios futuros, sem necessidade de nova inscrição. Seus dados
                permanecem no Sistema enquanto houver interesse ativo na vaga (ver Seção 8).
              </p>
            </SubSection>

            <SubSection title="Treinadores(as) e administradores(as)">
              <ul className="list-disc list-inside space-y-1">
                <li>Nome completo e e-mail (utilizados para autenticação no Sistema)</li>
                <li>Perfil de acesso (função no sistema)</li>
                <li>
                  <strong>Foto de perfil</strong> — imagem fornecida voluntariamente para
                  identificação visual no Sistema; não é obrigatória e pode ser removida a qualquer
                  momento pelo próprio usuário ou por um administrador
                </li>
                <li>Registros de ações realizadas no Sistema (log de auditoria), incluindo data/hora,
                  tipo de ação e identificação do registro afetado</li>
              </ul>
            </SubSection>

            <SubSection title="Galeria de fotos das turmas">
              <p className="text-sm text-gray-700">
                O Sistema permite que treinadores(as) e administradores(as) publiquem fotos das
                atividades das turmas, associadas a um título e uma data. Essas imagens:
              </p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>São carregadas voluntariamente por staff autorizado</li>
                <li>Ficam armazenadas no serviço Supabase Storage e acessíveis internamente no Sistema</li>
                <li>
                  <strong>Podem conter imagens de menores de idade</strong> — a publicação de
                  qualquer foto que identifique crianças ou adolescentes pressupõe que a ADTRISC
                  possui autorização prévia dos respectivos responsáveis legais para uso da imagem
                  em contexto interno de gestão da escolinha (ver Seção 5)
                </li>
                <li>Incluem apenas metadados de título e data de publicação; nenhum dado biométrico
                  é extraído ou processado automaticamente a partir das imagens</li>
              </ul>
            </SubSection>
          </Section>

          {/* 3 */}
          <Section title="3. Finalidade do tratamento">
            <p className="mb-3">Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Gerenciar matrículas, turmas e frequência de atletas</li>
              <li>Acompanhar a evolução física e esportiva dos/das atletas, incluindo resultados
                de avaliações físicas e tempos em provas de natação</li>
              <li>Gerir o processo seletivo de candidatos, incluindo a manutenção da lista de
                espera e a realização de sorteios auditáveis e rastreáveis</li>
              <li>Avaliar aptidão e segurança para a prática esportiva, com base em informações
                de saúde fornecidas voluntariamente</li>
              <li>Identificação visual interna de atletas e treinadores(as) por meio de foto de
                perfil, para facilitar a gestão e o reconhecimento no Sistema</li>
              <li>Registro fotográfico das atividades das turmas na galeria interna, como memória
                institucional e instrumento de acompanhamento das atividades esportivas</li>
              <li>Comunicação com responsáveis legais sobre atividades e desempenho</li>
              <li>Controle de acesso ao Sistema por parte de treinadores(as) e administradores(as)</li>
              <li>Registro de auditoria das ações administrativas, para garantia de integridade,
                rastreabilidade e segurança operacional</li>
              <li>Cumprimento de obrigações legais e regulatórias aplicáveis à entidade</li>
            </ul>
            <p className="mt-3">
              Seus dados <strong>não serão utilizados</strong> para fins de marketing,
              publicidade, venda ou compartilhamento comercial com terceiros.
            </p>
          </Section>

          {/* 4 */}
          <Section title="4. Base legal para o tratamento">
            <p className="mb-3">
              O tratamento de dados pessoais é fundamentado nas seguintes hipóteses previstas
              no Art. 7º da LGPD:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>
                <strong>Execução de contrato (Art. 7º, V)</strong> — para gestão da matrícula e
                prestação das atividades esportivas contratadas.
              </li>
              <li>
                <strong>Legítimo interesse (Art. 7º, IX)</strong> — para acompanhamento pedagógico
                e esportivo dos/das atletas, segurança do ambiente e manutenção de lista de espera
                do processo seletivo.
              </li>
              <li>
                <strong>Consentimento (Art. 7º, I)</strong> — para coleta de dados como medidas
                corporais, avaliações físicas, fotos de perfil e publicação de imagens na galeria
                de turmas, obtido no ato da matrícula ou no momento do envio.
              </li>
              <li>
                <strong>Cumprimento de obrigação legal (Art. 7º, II)</strong> — para obrigações
                contábeis, fiscais e regulatórias da associação.
              </li>
              <li>
                <strong>Dados sensíveis de saúde — Consentimento específico e destacado (Art. 11, I)</strong>{' '}
                — informações sobre condições médicas, tratamentos e alergias coletadas no formulário
                de inscrição de candidatos são dados sensíveis nos termos do Art. 5º, II da LGPD.
                Seu tratamento é realizado com base no consentimento expresso do responsável legal,
                manifestado no ato do preenchimento do formulário, com a finalidade exclusiva de
                garantir a segurança e aptidão do/da candidato(a) para a prática esportiva
                (Art. 11, II, &quot;f&quot; c/c Art. 11, I).
              </li>
              <li>
                <strong>Imagens de menores na galeria — Consentimento específico do responsável
                legal (Arts. 7º, I e 14, §1º)</strong> — a publicação de fotos que identifiquem
                crianças ou adolescentes na galeria de turmas requer autorização prévia e específica
                dos respectivos responsáveis legais para uso da imagem neste contexto.
              </li>
            </ul>
          </Section>

          {/* 5 */}
          <Section title="5. Proteção especial de dados de menores">
            <p>
              A ADTRISC trata dados de crianças e adolescentes com atenção redobrada, conforme
              o <strong>Art. 14 da LGPD</strong>. O tratamento de dados de menores de 18 anos
              ocorre com o consentimento expresso de pelo menos um/uma responsável legal,
              formalizado na ficha de inscrição ou matrícula.
            </p>
            <p className="mt-2">
              Isso se aplica tanto a atletas matriculados(as) quanto a candidatos ao processo
              seletivo — os dados de saúde coletados no formulário de inscrição (condição médica,
              tratamento e alergias) são tratados com base no consentimento específico e destacado
              do responsável legal, nos termos dos Arts. 11, I e 14, §1º da LGPD.
            </p>
            <p className="mt-2">
              Dados de menores de 12 anos são tratados exclusivamente com consentimento
              específico e destacado dos responsáveis legais, em conformidade com o
              Estatuto da Criança e do Adolescente (ECA).
            </p>
            <p className="mt-2">
              <strong>Imagens na galeria:</strong> a publicação de fotografias que identifiquem
              menores de 18 anos na galeria de turmas pressupõe que a ADTRISC possui autorização
              expressa e específica dos respectivos responsáveis legais para o uso da imagem da
              criança ou adolescente em contexto interno de registro das atividades esportivas.
              O responsável legal pode solicitar a remoção de qualquer imagem a qualquer tempo,
              mediante contato com a ADTRISC (ver Seção 11).
            </p>
          </Section>

          {/* 6 */}
          <Section title="6. Compartilhamento de dados">
            <p>
              Os dados coletados <strong>não são vendidos, alugados ou compartilhados</strong>{' '}
              com terceiros para fins comerciais. O compartilhamento é restrito a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>
                <strong>Supabase Inc.</strong> — plataforma de banco de dados e armazenamento de
                arquivos utilizada para armazenar os dados estruturados e as imagens (fotos de
                perfil e galeria de turmas), com servidores localizados nos Estados Unidos. O
                acesso é restrito por credenciais seguras e políticas de controle de acesso por
                perfil (Row Level Security). As imagens são armazenadas no serviço Supabase
                Storage com URLs de acesso controlado.
              </li>
              <li>
                <strong>Vercel Inc.</strong> — plataforma de hospedagem da aplicação, sujeita
                às políticas de privacidade próprias, com infraestrutura em nuvem.
              </li>
              <li>
                <strong>Autoridades públicas</strong> — quando exigido por lei ou decisão judicial.
              </li>
            </ul>
            <p className="mt-3">
              Tanto a Supabase quanto a Vercel são certificadas conforme padrões internacionais
              de segurança (SOC 2, ISO 27001) e aderem ao GDPR europeu, oferecendo nível
              adequado de proteção.
            </p>
          </Section>

          {/* 7 */}
          <Section title="7. Armazenamento e segurança">
            <p className="mb-3">
              Adotamos medidas técnicas e organizacionais para proteger seus dados:
            </p>
            <ul className="list-disc list-inside space-y-1.5">
              <li>Autenticação segura com controle de acesso por perfil (admin, treinador/a, atleta, responsável)</li>
              <li>Exigência de senha forte para contas de treinadores(as) e administradores(as) (mínimo 8 caracteres, com letras maiúsculas, minúsculas, números e caracteres especiais)</li>
              <li>Comunicação criptografada via HTTPS/TLS em todas as requisições</li>
              <li>Acesso ao banco de dados restrito por políticas de segurança em nível de linha (Row Level Security)</li>
              <li>Senhas armazenadas com hash seguro — nunca em texto claro</li>
              <li>Registro automático de auditoria de todas as ações de criação, edição e exclusão de dados, identificando o usuário responsável, data/hora e o estado anterior e posterior do registro</li>
              <li>
                Imagens (fotos de perfil de atletas e treinadores, fotos da galeria de turmas)
                armazenadas no Supabase Storage com cache imutável de longa duração; o acesso
                às imagens é feito por URLs que ficam dentro do ambiente da plataforma; operações
                de exclusão removem permanentemente o arquivo do bucket
              </li>
              <li>Compressão e redimensionamento de imagens realizados no lado do cliente antes
                do envio, limitando o tamanho e a resolução máximos armazenados</li>
              <li>Backups automáticos gerenciados pela Supabase</li>
              <li>Acesso administrativo limitado ao pessoal autorizado</li>
            </ul>
          </Section>

          {/* 8 */}
          <Section title="8. Retenção dos dados">
            <p>
              Os dados pessoais são mantidos pelo período necessário à prestação dos serviços
              e ao cumprimento das obrigações legais, observados os seguintes critérios:
            </p>
            <ul className="list-disc list-inside space-y-1.5 mt-2">
              <li>
                <strong>Dados de atletas ativos(as)</strong> — mantidos durante o período de
                matrícula ativa e por até 5 anos após o encerramento, para fins de histórico
                e cumprimento de obrigações fiscais.
              </li>
              <li>
                <strong>Fotos de perfil de atletas e treinadores(as)</strong> — mantidas enquanto
                o cadastro estiver ativo; removidas automaticamente do armazenamento quando o
                usuário ou um administrador solicitar a exclusão ou substituição da imagem.
                A remoção é permanente e imediata.
              </li>
              <li>
                <strong>Dados de acesso (treinadores/as e administradores/as)</strong> — mantidos
                enquanto o acesso estiver ativo e por 1 ano após o encerramento.
              </li>
              <li>
                <strong>Avaliações físicas</strong> — mantidas durante a vigência da matrícula
                e por até 5 anos para fins de histórico esportivo.
              </li>
              <li>
                <strong>Dados de candidatos ao processo seletivo — lista de espera</strong> — o
                formulário de inscrição é permanentemente público e candidatos não contemplados
                em um sorteio permanecem automaticamente na lista de espera para sorteios futuros.
                Seus dados são mantidos enquanto houver interesse ativo na vaga, podendo o
                responsável legal solicitar a exclusão a qualquer tempo (ver Seção 9).
                Dados de saúde (condição médica, tratamento e alergias) de candidatos que
                solicitem exclusão da lista de espera são removidos imediatamente.
              </li>
              <li>
                <strong>Registros de sorteio</strong> — mantidos por prazo indeterminado para fins
                de auditabilidade e transparência do processo seletivo, contendo apenas nome e
                identificador interno dos candidatos participantes.
              </li>
              <li>
                <strong>Galeria de fotos das turmas</strong> — imagens mantidas enquanto a turma
                estiver ativa no Sistema e por até 2 anos após o encerramento das atividades da
                turma; podem ser removidas individualmente por treinadores(as) ou administradores(as)
                a qualquer tempo, com exclusão permanente e imediata do armazenamento.
              </li>
              <li>
                <strong>Logs de auditoria</strong> — mantidos por até 2 anos para fins de
                rastreabilidade, segurança operacional e cumprimento de obrigações legais.
                Os logs incluem snapshots de dados pessoais no momento das alterações e são
                acessíveis apenas por administradores(as).
              </li>
            </ul>
            <p className="mt-2">
              Após o período de retenção, os dados são excluídos de forma segura ou anonimizados.
            </p>
          </Section>

          {/* 9 */}
          <Section title="9. Seus direitos (Art. 18 da LGPD)">
            <p className="mb-3">
              Como titular de dados, você tem os seguintes direitos, que podem ser exercidos
              a qualquer momento mediante solicitação:
            </p>
            <ul className="space-y-2">
              {[
                ['Confirmação e acesso', 'Saber se tratamos seus dados e ter acesso a eles.'],
                ['Correção', 'Solicitar a correção de dados incompletos, inexatos ou desatualizados.'],
                ['Anonimização, bloqueio ou eliminação', 'Requerer a anonimização ou eliminação de dados desnecessários ou excessivos.'],
                ['Portabilidade', 'Receber seus dados em formato estruturado para transferência a outra entidade.'],
                ['Eliminação', 'Solicitar a exclusão dos dados tratados com base em consentimento, incluindo remoção da lista de espera do processo seletivo e exclusão de fotos de perfil ou imagens da galeria, ressalvadas as obrigações legais.'],
                ['Informação sobre compartilhamento', 'Saber com quais entidades compartilhamos seus dados.'],
                ['Revogação do consentimento', 'Retirar o consentimento dado anteriormente, sem prejuízo da licitude do tratamento realizado até então.'],
                ['Oposição', 'Opor-se ao tratamento realizado com fundamento em outras hipóteses legais, em caso de descumprimento da LGPD.'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-2">
                  <span className="text-sky-500 font-bold flex-shrink-0">→</span>
                  <span><strong>{title}:</strong> {desc}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* 10 */}
          <Section title="10. Cookies e rastreamento">
            <p>
              O Sistema utiliza <strong>cookies de sessão</strong> exclusivamente para manter o
              usuário autenticado durante o uso. Não utilizamos cookies de rastreamento,
              publicidade ou análise comportamental de terceiros.
            </p>
          </Section>

          {/* 11 */}
          <Section title="11. Como exercer seus direitos e nos contatar">
            <p>
              Para exercer qualquer direito previsto nesta política — incluindo exclusão da
              lista de espera do processo seletivo, remoção de foto de perfil ou exclusão de
              imagem da galeria de turmas — ou para esclarecer dúvidas sobre o tratamento de
              seus dados, entre em contato com o encarregado pelo tratamento de dados (DPO) da ADTRISC:
            </p>
            <div className="mt-3 p-4 bg-gray-100 rounded-lg">
              <p className="font-semibold text-gray-800">ADTRISC — Encarregado de Dados</p>
              <p className="mt-1">
                <strong>E-mail:</strong>{' '}
                <a href="mailto:contato@adtrisc.com.br" className="text-sky-500 hover:underline">
                  contato@adtrisc.com.br
                </a>
              </p>
              <p>
                Você pode também registrar reclamações perante a{' '}
                <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> pelo
                portal <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer"
                  className="text-sky-500 hover:underline">gov.br/anpd</a>.
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Respondemos às solicitações em até 15 dias corridos, conforme prazo previsto na LGPD.
            </p>
          </Section>

          {/* 12 */}
          <Section title="12. Alterações nesta política">
            <p>
              Esta política pode ser atualizada periodicamente. Alterações relevantes serão
              comunicadas por meio do Sistema ou diretamente aos titulares afetados. A versão
              vigente estará sempre disponível nesta página com a data de última atualização.
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} ADTRISC — Associação Desportiva Triatlética de Santa Catarina
          </p>
          <Link
            href="/login"
            className="text-xs font-medium text-sky-500 hover:text-sky-600 flex items-center gap-1"
          >
            <ChevronLeft size={13} /> Voltar ao login
          </Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-base font-bold mb-3 pb-2 border-b-2"
        style={{ color: '#0C143D', borderColor: '#2AABE1' }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{title}</h3>
      {children}
    </div>
  )
}
