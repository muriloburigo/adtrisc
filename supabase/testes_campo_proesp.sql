-- Testes de campo (natação 50/100 m), altura do banco da estatura sentado,
-- configurações das avaliações e fim da tabela zonas_treino (zonas passam a ser
-- calculadas a partir do teste mais recente — lib/zonas.ts).
-- Run this in the Supabase SQL editor. Precisa de get_my_role() (schema_v2.sql)
-- e de avaliacoes_extras_zonas.sql.

alter table public.avaliacoes_fisicas add column if not exists natacao_50m numeric;   -- segundos
alter table public.avaliacoes_fisicas add column if not exists natacao_100m numeric;  -- segundos
-- Altura do banco (cm) usada ao medir a estatura sentado a partir do chão.
-- Tronco = estatura_sentado - altura_banco. Nulo = medida já é o tronco.
alter table public.avaliacoes_fisicas add column if not exists altura_banco numeric;

-- Configurações das avaliações (linha única, id = 1)
create table if not exists public.config_avaliacao (
  id                    smallint primary key default 1 check (id = 1),
  zona_limites          numeric[] not null default '{65,75,85,95,120}', -- % da velocidade do teste, topo de Z1..Z5
  altura_banco_padrao   numeric not null default 40,                    -- cm
  natacao_100m_corte_s  numeric,                                        -- tempo máximo p/ subir para a equipe
  updated_at            timestamptz not null default now(),
  check (array_length(zona_limites, 1) = 5)
);
insert into public.config_avaliacao (id) values (1) on conflict (id) do nothing;

alter table public.config_avaliacao enable row level security;

drop policy if exists "config_avaliacao_select" on public.config_avaliacao;
create policy "config_avaliacao_select" on public.config_avaliacao
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));

drop policy if exists "config_avaliacao_update" on public.config_avaliacao;
create policy "config_avaliacao_update" on public.config_avaliacao
  for update to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- Zonas agora são derivadas dos testes; a tabela guardava zonas estáticas
-- importadas de planilha (com outros percentuais).
drop table if exists public.zonas_treino;
