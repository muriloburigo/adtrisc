-- ============================================================
-- ADTRISC — Schema v2
-- Execute no SQL Editor do Supabase (ordem importa)
-- ============================================================

-- --------------------------------------------------------
-- 1. Atualizar profiles: adicionar role 'pai'
-- --------------------------------------------------------
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'coach', 'aluno', 'pai'));

-- --------------------------------------------------------
-- 2. Turmas
-- --------------------------------------------------------
create table if not exists public.turmas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  modalidade     text not null default 'triathlon'
                   check (modalidade in ('natacao', 'ciclismo', 'corrida', 'triathlon')),
  dias_semana    text[] not null default '{}',
  horario_inicio time not null,
  horario_fim    time not null,
  coach_id       uuid references public.profiles(id) on delete set null,
  capacidade     smallint not null default 20,
  status         text not null default 'ativa'
                   check (status in ('ativa', 'inativa', 'suspensa')),
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists turmas_coach_id_idx on public.turmas(coach_id);
create index if not exists turmas_status_idx   on public.turmas(status);

-- --------------------------------------------------------
-- 3. Alunos (substitui athletes)
-- --------------------------------------------------------
create table if not exists public.alunos (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete set null,
  turma_id        uuid not null references public.turmas(id) on delete restrict,

  nome            text not null,
  telefone        text,
  sexo            text check (sexo in ('M', 'F', 'outro')),
  data_nascimento date,

  rua             text,
  numero          text,
  bairro          text,
  cep             text,
  cidade          text,

  status          text not null default 'ativo'
                    check (status in ('ativo', 'inativo', 'suspenso')),
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists alunos_turma_id_idx   on public.alunos(turma_id);
create index if not exists alunos_profile_id_idx on public.alunos(profile_id);
create index if not exists alunos_status_idx     on public.alunos(status);

-- --------------------------------------------------------
-- 4. Responsaveis (pais/mães)
-- --------------------------------------------------------
create table if not exists public.responsaveis (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid references public.profiles(id) on delete set null,
  nome            text not null,
  cpf             text,
  rg              text,
  email           text,
  telefone        text,
  parentesco      text not null check (parentesco in ('mae', 'pai', 'outro')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists responsaveis_email_idx on public.responsaveis(email);

-- --------------------------------------------------------
-- 5. Aluno <-> Responsavel (junction)
-- --------------------------------------------------------
create table if not exists public.aluno_responsavel (
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  responsavel_id  uuid not null references public.responsaveis(id) on delete cascade,
  principal       boolean not null default false,
  primary key (aluno_id, responsavel_id)
);

create index if not exists aluno_resp_resp_id_idx on public.aluno_responsavel(responsavel_id);

-- --------------------------------------------------------
-- 6. Pagamentos (substitui payments)
-- --------------------------------------------------------
create table if not exists public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  valor           numeric(10,2) not null,
  vencimento      date not null,
  pago_em         date,
  status          text not null default 'pendente'
                    check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  descricao       text,
  mes_referencia  text,
  created_at      timestamptz not null default now()
);

create index if not exists pagamentos_aluno_id_idx  on public.pagamentos(aluno_id);
create index if not exists pagamentos_status_idx    on public.pagamentos(status);
create index if not exists pagamentos_vencimento_idx on public.pagamentos(vencimento);

-- --------------------------------------------------------
-- 7. Triggers updated_at
-- --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists turmas_updated_at      on public.turmas;
drop trigger if exists alunos_updated_at      on public.alunos;
drop trigger if exists responsaveis_updated_at on public.responsaveis;

create trigger turmas_updated_at before update on public.turmas
  for each row execute function public.set_updated_at();
create trigger alunos_updated_at before update on public.alunos
  for each row execute function public.set_updated_at();
create trigger responsaveis_updated_at before update on public.responsaveis
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------
-- 8. RLS
-- --------------------------------------------------------
alter table public.turmas          enable row level security;
alter table public.alunos          enable row level security;
alter table public.responsaveis    enable row level security;
alter table public.aluno_responsavel enable row level security;
alter table public.pagamentos      enable row level security;

-- Helper: role do usuário logado
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Turmas
create policy "turmas_select" on public.turmas
  for select to authenticated using (true);
create policy "turmas_insert" on public.turmas
  for insert to authenticated with check (public.get_my_role() in ('admin', 'coach'));
create policy "turmas_update" on public.turmas
  for update to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "turmas_delete" on public.turmas
  for delete to authenticated using (public.get_my_role() = 'admin');

-- Alunos
create policy "alunos_select_staff" on public.alunos
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "alunos_select_pai" on public.alunos
  for select to authenticated using (
    public.get_my_role() = 'pai' and
    id in (
      select ar.aluno_id from public.aluno_responsavel ar
      join public.responsaveis r on r.id = ar.responsavel_id
      where r.profile_id = auth.uid()
    )
  );
create policy "alunos_write" on public.alunos
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Responsaveis
create policy "responsaveis_select_staff" on public.responsaveis
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "responsaveis_select_self" on public.responsaveis
  for select to authenticated using (profile_id = auth.uid());
create policy "responsaveis_write" on public.responsaveis
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- aluno_responsavel
create policy "aluno_responsavel_select" on public.aluno_responsavel
  for select to authenticated using (
    public.get_my_role() in ('admin', 'coach') or
    responsavel_id in (
      select id from public.responsaveis where profile_id = auth.uid()
    )
  );
create policy "aluno_responsavel_write" on public.aluno_responsavel
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- Pagamentos
create policy "pagamentos_select_staff" on public.pagamentos
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "pagamentos_select_pai" on public.pagamentos
  for select to authenticated using (
    public.get_my_role() = 'pai' and
    aluno_id in (
      select ar.aluno_id from public.aluno_responsavel ar
      join public.responsaveis r on r.id = ar.responsavel_id
      where r.profile_id = auth.uid()
    )
  );
create policy "pagamentos_write" on public.pagamentos
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
