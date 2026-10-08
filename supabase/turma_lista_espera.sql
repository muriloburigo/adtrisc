-- Turma genérica "Lista de espera": o formulário público de inscrição a usa quando
-- NENHUMA outra turma está com captação aberta, para a captação nunca parar. A
-- flag `lista_espera` identifica essa turma (o nome pode mudar); ela é excluída da
-- lista normal de turmas abertas e só aparece no formulário como fallback.
-- `captacao_aberta = true` para passar na validação da action de inscrição.
-- Run this in the Supabase SQL editor — depois de schema_v2.sql.

alter table public.turmas add column if not exists lista_espera boolean not null default false;

insert into public.turmas (nome, modalidade, dias_semana, horario_inicio, horario_fim,
  capacidade, status, captacao_aberta, lista_espera, usa_treinos, observacoes)
select 'Lista de espera', 'triathlon', '{}', '00:00', '00:00',
  999, 'ativa', true, true, false,
  'Turma genérica para captação contínua: recebe inscrições quando nenhuma turma específica está aberta. A equipe move o candidato para a turma real quando surge vaga.'
where not exists (select 1 from public.turmas where lista_espera);
