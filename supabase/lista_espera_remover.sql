-- Desfaz a abordagem de "turma Lista de espera" (turma_lista_espera.sql). Em vez de
-- uma turma genérica, quando nenhuma turma está com captação aberta a inscrição vira
-- um CANDIDATO SEM TURMA (turma_id null), que aparece no menu Candidatos como "Sem
-- turma" para a equipe distribuir depois. Mais simples e sem turma fantasma na lista.
-- Run this in the Supabase SQL editor — depois de turma_lista_espera.sql.

-- Candidatos que tenham caído na turma de espera voltam a ficar sem turma.
update public.candidatos set turma_id = null
  where turma_id in (select id from public.turmas where lista_espera);

delete from public.turmas where lista_espera;
alter table public.turmas drop column if exists lista_espera;
