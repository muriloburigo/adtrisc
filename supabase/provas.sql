-- Run this in the Supabase SQL editor
-- Provas — competições externas onde os alunos participam (ex: Duathlon São José)

create table if not exists public.provas (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  local       text not null,
  data        date not null,
  observacoes text,
  criado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Categorias por faixa etária, cada uma com suas etapas (modalidade + distância, em ordem)
-- etapas: jsonb array, ex: [{"modalidade":"corrida","distancia_metros":5000},
--                           {"modalidade":"ciclismo","distancia_metros":20000},
--                           {"modalidade":"corrida","distancia_metros":2500}]
create table if not exists public.prova_categorias (
  id         uuid primary key default gen_random_uuid(),
  prova_id   uuid not null references public.provas(id) on delete cascade,
  nome       text not null,
  idade_min  integer,
  idade_max  integer,
  etapas     jsonb not null default '[]'::jsonb,
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Resultado de um aluno em uma prova (uma linha por aluno por prova)
create table if not exists public.resultados_prova (
  id                   uuid primary key default gen_random_uuid(),
  prova_id             uuid not null references public.provas(id) on delete cascade,
  categoria_id         uuid not null references public.prova_categorias(id) on delete cascade,
  aluno_id             uuid not null references public.alunos(id) on delete cascade,
  tempo_total_segundos numeric,
  colocacao_geral      integer,
  colocacao_categoria  integer,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (prova_id, aluno_id)
);

create index if not exists idx_prova_categorias_prova_id   on public.prova_categorias(prova_id);
create index if not exists idx_resultados_prova_prova_id   on public.resultados_prova(prova_id);
create index if not exists idx_resultados_prova_categoria  on public.resultados_prova(categoria_id);
create index if not exists idx_resultados_prova_aluno_id   on public.resultados_prova(aluno_id);

-- updated_at triggers (reusa a função já existente set_updated_at)
drop trigger if exists provas_updated_at on public.provas;
create trigger provas_updated_at before update on public.provas
  for each row execute function public.set_updated_at();

drop trigger if exists prova_categorias_updated_at on public.prova_categorias;
create trigger prova_categorias_updated_at before update on public.prova_categorias
  for each row execute function public.set_updated_at();

drop trigger if exists resultados_prova_updated_at on public.resultados_prova;
create trigger resultados_prova_updated_at before update on public.resultados_prova
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------
-- RLS — provas são um evento compartilhado (não pertencem a uma turma
-- específica), então qualquer staff (admin ou coach) pode ler/gerenciar.
-- Resultados, por envolverem alunos, seguem o mesmo escopo por turma do
-- coach usado em avaliacoes_fisicas/presencas (public.coach_has_turma()).
-- --------------------------------------------------------
alter table public.provas          enable row level security;
alter table public.prova_categorias enable row level security;
alter table public.resultados_prova enable row level security;

create policy "provas_select_staff" on public.provas
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "provas_write_staff" on public.provas
  for all to authenticated
  using (public.get_my_role() in ('admin', 'coach'))
  with check (public.get_my_role() in ('admin', 'coach'));

create policy "prova_categorias_select_staff" on public.prova_categorias
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "prova_categorias_write_staff" on public.prova_categorias
  for all to authenticated
  using (public.get_my_role() in ('admin', 'coach'))
  with check (public.get_my_role() in ('admin', 'coach'));

create policy "resultados_prova_select" on public.resultados_prova
  for select to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );
create policy "resultados_prova_write" on public.resultados_prova
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
