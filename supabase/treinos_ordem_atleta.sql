-- Ordem dos cards dentro do dia, por atleta (arrastar para trocar a ordem).
-- treino_sessoes.ordem continua sendo a ordem da turma (visão da turma). Na visão
-- do atleta (calendário do atleta e portal) vale a ordem pessoal: a do treino fica
-- na entrega (sessão × atleta) e a da atividade extra na própria execução.
-- Nulo = sem ordem pessoal (usa a da turma; extras vão depois, pela hora).
-- Run this in the Supabase SQL editor — after treinos.sql.

alter table public.treino_entregas  add column if not exists ordem numeric(6,2);
alter table public.treino_execucoes add column if not exists ordem numeric(6,2);
