-- ============================================================
-- ADTRISC — Schema do Banco de Dados
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Habilita extensão UUID
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------
-- PROFILES (espelha auth.users)
-- --------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  role         text not null default 'athlete' check (role in ('admin', 'coach', 'athlete')),
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger para criar profile automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------
-- ATHLETES
-- --------------------------------------------------------
create table public.athletes (
  id                 uuid primary key default uuid_generate_v4(),
  profile_id         uuid not null references public.profiles(id) on delete cascade,
  coach_id           uuid references public.profiles(id) on delete set null,
  birth_date         date,
  phone              text,
  emergency_contact  text,
  modality           text check (modality in ('sprint', 'olimpico', 'meio', 'ironman')),
  status             text not null default 'ativo' check (status in ('ativo', 'inativo', 'suspenso')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- --------------------------------------------------------
-- TRAINING PLANS
-- --------------------------------------------------------
create table public.training_plans (
  id           uuid primary key default uuid_generate_v4(),
  athlete_id   uuid not null references public.athletes(id) on delete cascade,
  coach_id     uuid not null references public.profiles(id),
  title        text not null,
  description  text,
  start_date   date not null,
  end_date     date,
  status       text not null default 'ativo' check (status in ('ativo', 'concluido', 'pausado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- --------------------------------------------------------
-- SESSIONS (treinos individuais)
-- --------------------------------------------------------
create table public.sessions (
  id               uuid primary key default uuid_generate_v4(),
  plan_id          uuid not null references public.training_plans(id) on delete cascade,
  date             date not null,
  sport            text not null check (sport in ('natacao', 'ciclismo', 'corrida', 'musculacao', 'outro')),
  duration_minutes integer,
  distance_km      numeric(6,2),
  description      text,
  completed        boolean not null default false,
  notes            text,
  created_at       timestamptz not null default now()
);

-- --------------------------------------------------------
-- PAYMENTS
-- --------------------------------------------------------
create table public.payments (
  id           uuid primary key default uuid_generate_v4(),
  athlete_id   uuid not null references public.athletes(id) on delete cascade,
  amount       numeric(10,2) not null,
  due_date     date not null,
  paid_at      timestamptz,
  status       text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  description  text,
  created_at   timestamptz not null default now()
);

-- --------------------------------------------------------
-- RLS (Row Level Security)
-- --------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.athletes       enable row level security;
alter table public.training_plans enable row level security;
alter table public.sessions       enable row level security;
alter table public.payments       enable row level security;

-- Policies: admin vê tudo, coach vê seus atletas, atleta vê só o seu
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "athletes_select" on public.athletes for select to authenticated using (true);
create policy "athletes_insert" on public.athletes for insert to authenticated with check (true);
create policy "athletes_update" on public.athletes for update to authenticated using (true);

create policy "plans_select" on public.training_plans for select to authenticated using (true);
create policy "plans_insert" on public.training_plans for insert to authenticated with check (true);
create policy "plans_update" on public.training_plans for update to authenticated using (true);

create policy "sessions_select" on public.sessions for select to authenticated using (true);
create policy "sessions_insert" on public.sessions for insert to authenticated with check (true);
create policy "sessions_update" on public.sessions for update to authenticated using (true);

create policy "payments_select" on public.payments for select to authenticated using (true);
create policy "payments_insert" on public.payments for insert to authenticated with check (true);
create policy "payments_update" on public.payments for update to authenticated using (true);

-- --------------------------------------------------------
-- Trigger updated_at automático
-- --------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.athletes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.training_plans
  for each row execute function public.set_updated_at();
