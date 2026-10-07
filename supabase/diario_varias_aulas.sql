-- Diário em calendário: mais de uma aula no mesmo dia (ex.: pré equipe e equipe
-- com natação de manhã e corrida à tarde). Cada registro = uma aula com a sua
-- modalidade; antes era um registro por treinador por dia (unique coach_id+data).
-- `descricao` já existia em produção (criada à mão), fica documentada aqui.
-- Run this in the Supabase SQL editor — after diario_aulas.sql. Rode DEPOIS do
-- deploy do código novo (o antigo grava com upsert em coach_id+data).

alter table public.registros_aula add column if not exists descricao text;
alter table public.registros_aula drop constraint if exists registros_aula_coach_id_data_key;
create index if not exists registros_aula_coach_data on public.registros_aula (coach_id, data);
