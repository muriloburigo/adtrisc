-- Avaliação física: testes que a pré equipe passou a fazer em 2026.1
-- (Dabonneville 5', maturação somática, ciclismo 2 km, link da atividade)
-- + tabela de zonas de treino (corrida/ciclismo) por atleta.
-- Run this in the Supabase SQL editor. Precisa de coach_has_turma()
-- (turma_access_scoping.sql).

alter table public.avaliacoes_fisicas add column if not exists resistencia_5min_dabonneville integer; -- metros
alter table public.avaliacoes_fisicas add column if not exists maturity_offset numeric;               -- anos até/desde o PHV
alter table public.avaliacoes_fisicas add column if not exists maturity_classificacao text;           -- ex.: "Janela do PHV"
alter table public.avaliacoes_fisicas add column if not exists ciclismo_2km_tempo numeric;            -- segundos
alter table public.avaliacoes_fisicas add column if not exists ciclismo_2km_velocidade numeric;       -- km/h, derivado do tempo
alter table public.avaliacoes_fisicas add column if not exists atividade_url text;                    -- Garmin/Polar/Strava

-- Zonas de treino atuais do atleta. `faixa_min`/`faixa_max` são pace em
-- segundos por km (corrida) ou velocidade em km/h (ciclismo). Uma linha por
-- atleta + modalidade + zona; reimportar zonas novas sobrescreve as antigas.
create table if not exists public.zonas_treino (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  modalidade      text not null check (modalidade in ('corrida', 'ciclismo')),
  zona            smallint not null check (zona between 1 and 5),
  faixa_min       numeric,
  faixa_max       numeric,
  fc_min          integer,
  fc_max          integer,
  tempo_400m_min  numeric, -- segundos
  tempo_400m_max  numeric, -- segundos
  referencia_data date,    -- data da avaliação que originou as zonas
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (aluno_id, modalidade, zona)
);
create index if not exists zonas_treino_aluno_id_idx on public.zonas_treino(aluno_id);

alter table public.zonas_treino enable row level security;

-- Mesmo escopo de avaliacoes_fisicas: admin tudo, coach só atletas das turmas dele.
drop policy if exists "zonas_treino_staff" on public.zonas_treino;
create policy "zonas_treino_staff" on public.zonas_treino
  for all to authenticated
  using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  )
  with check (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );
