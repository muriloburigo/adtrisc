-- Unifica os campos visíveis de /inscricao (candidatos) e /ficha/[token]
-- (fichas_inscricao) — mesmo formulário nas duas telas, tabelas continuam
-- separadas (cada uma mantém seu processo por trás: sorteio vs. matrícula
-- já confirmada). Todas as colunas são novas e nullable — nada existente
-- é removido ou alterado.

-- candidatos: ganha telefone do participante, endereço em campos separados
-- (mantendo endereco_completo pra compatibilidade com o que já existe),
-- filiação mãe/pai (substituindo o "responsável" único genérico pra novas
-- inscrições — responsavel_nome/telefone/email continuam existindo e
-- passam a espelhar a mãe, com fallback pro pai) e assinatura digital.
alter table public.candidatos
  add column if not exists telefone           text,
  add column if not exists rua                text,
  add column if not exists numero             text,
  add column if not exists bairro             text,
  add column if not exists cep                text,
  add column if not exists cidade             text,
  add column if not exists mae_nome           text,
  add column if not exists mae_cpf            text,
  add column if not exists mae_rg             text,
  add column if not exists mae_email          text,
  add column if not exists mae_telefone       text,
  add column if not exists pai_nome           text,
  add column if not exists pai_cpf            text,
  add column if not exists pai_rg             text,
  add column if not exists pai_email          text,
  add column if not exists pai_telefone       text,
  add column if not exists responsavel_assina text,
  add column if not exists assinatura_data    text;

-- fichas_inscricao: ganha CPF do participante e os blocos que só existiam
-- em /inscricao (escola, saúde, histórico esportivo, equipamentos).
alter table public.fichas_inscricao
  add column if not exists p_cpf                       text,
  add column if not exists escola_nome_endereco         text,
  add column if not exists serie_escolar                text,
  add column if not exists condicao_medica              boolean not null default false,
  add column if not exists condicao_medica_descricao    text,
  add column if not exists tratamento_medico            boolean not null default false,
  add column if not exists tratamento_medico_descricao  text,
  add column if not exists alergia                      boolean not null default false,
  add column if not exists alergia_descricao             text,
  add column if not exists autorizacao_medica            boolean not null default false,
  add column if not exists praticou_modalidade           boolean not null default false,
  add column if not exists interesse_eventos             boolean not null default false,
  add column if not exists como_soube                    text,
  add column if not exists tem_bicicleta                 boolean not null default false,
  add column if not exists tamanho_camiseta               text;
