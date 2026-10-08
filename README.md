# ADTRISC — Sistema de Gestão

Sistema da **Associação Desportiva Triatlética de Santa Catarina (ADTRISC)** para a Escolinha de Triathlon São José e as equipes: turmas, atletas, presenças, avaliações físicas, inscrições e prestação de contas.

Produção: https://app.adtrisc.com.br (sistema) · https://www.adtrisc.com.br (site institucional)

> A documentação técnica completa (schema, regras de acesso, convenções, deploy, backup e restauração) está em **[AGENTS.md](./AGENTS.md)**. Leia antes de mexer no código.

## Principais áreas

- **Turmas**: cadastro, galeria de fotos, relatório mensal e aba **Desempenho** com os resultados de cada atleta.
- **Atletas**: cadastro com responsáveis e dados da ficha de inscrição. A ficha preenchida pelos pais atualiza o cadastro sozinha. Há bloqueio de cadastro duplicado e **transferência entre turmas** (direta ou com confirmação do outro treinador).
- **Presenças**: chamada por turma e data, e exportação da lista de presença.
- **Avaliações físicas**: grade por turma, classificação PROESP-Br, maturação (Mirwald), testes de campo e zonas de treino. Página de referências em `/avaliacoes/referencia`.
- **Relatórios** (`/relatorios`): filtros combinados sobre cadastro, ficha e avaliações (incluindo evolução), com relatórios salvos por usuário. Não exporta: os resultados aparecem na tela.
- **Diário de aulas**: registro de cada aula, resumo do mês e relatório assinado.
- **Assinaturas**: a assinatura desenhada do treinador entra nos rodapés dos relatórios. Ao lado fica o espaço para o selo do **gov.br** (assinador.iti.br). No envio do PDF, o sistema identifica quem assinou digitalmente.
- **Configurações**: usuários, parâmetros das avaliações e **processos SGPE** por projeto e ano.
- **Inscrições públicas** (`/inscricao`), fichas digitais (`/ficha/[token]`), candidatos e sorteio, provas, imprensa, financeiro e auditoria.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Vercel.

## Desenvolvimento

```bash
cp .env.example .env.local   # preencha as chaves do Supabase
npm install
npm run dev                  # http://localhost:3000
npm run build                # confira antes de publicar
npm run lint
```

Migrations ficam em `supabase/*.sql` e são aplicadas à mão no SQL editor do Supabase. A ordem está em AGENTS.md, em "Backup & Restore".

## Deploy

Todo push na `main` publica em produção pela integração da Vercel com o GitHub. **Nunca use `vercel --prod` a partir da pasta local**: isso publica código sem commit, que some no push seguinte (ver AGENTS.md → Deployment).
