-- As colunas booleanas novas de fichas_inscricao (saúde, histórico esportivo,
-- equipamentos) foram criadas "not null default false" — como a ficha existe
-- (staff gera antes do responsável abrir o link) antes de qualquer resposta,
-- isso fazia o formulário mostrar "Não" pré-selecionado mesmo sem ninguém
-- ter respondido nada. Tornando nullable (sem default), "nunca respondido"
-- vira NULL de verdade, e o formulário mostra "Selecione..." até a resposta
-- real ser salva no envio.
alter table public.fichas_inscricao
  alter column condicao_medica     drop not null,
  alter column condicao_medica     drop default,
  alter column tratamento_medico   drop not null,
  alter column tratamento_medico   drop default,
  alter column alergia             drop not null,
  alter column alergia             drop default,
  alter column autorizacao_medica  drop not null,
  alter column autorizacao_medica  drop default,
  alter column praticou_modalidade drop not null,
  alter column praticou_modalidade drop default,
  alter column interesse_eventos   drop not null,
  alter column interesse_eventos   drop default,
  alter column tem_bicicleta       drop not null,
  alter column tem_bicicleta       drop default;

-- Nenhuma ficha ainda foi de fato respondida com esses campos novos (a
-- funcionalidade acabou de entrar no ar), então o "false" armazenado até
-- agora não representa resposta real de ninguém — zera pra NULL.
update public.fichas_inscricao set
  condicao_medica     = null,
  tratamento_medico   = null,
  alergia             = null,
  autorizacao_medica  = null,
  praticou_modalidade = null,
  interesse_eventos   = null,
  tem_bicicleta        = null
where status = 'pendente';
