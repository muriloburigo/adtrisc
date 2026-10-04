-- Portal do atleta: convites (criar conta / nova senha) e acesso do atleta.
-- Run this in the Supabase SQL editor — after treinos.sql and profiles_role_protecao.sql.
--
-- A conta do atleta (perfil 'aluno', ligada por alunos.profile_id) é criada por
-- um link de convite que o treinador manda pelo WhatsApp (o Supabase não manda
-- e-mail para fora da organização). Sem e-mail, o atleta escolhe um nome de
-- usuário e a conta usa o endereço interno <usuario>@atleta.adtrisc.invalid
-- (domínio reservado, nunca recebe e-mail).

-- Só atleta ATIVO tem acesso ao portal (desligado perde na hora).
create or replace function public.meu_aluno_id()
returns uuid language sql security definer stable set search_path = public as $$
  select id from public.alunos where profile_id = auth.uid() and status = 'ativo' limit 1
$$;

create or replace function public.minha_turma_id()
returns uuid language sql security definer stable set search_path = public as $$
  select turma_id from public.alunos where profile_id = auth.uid() and status = 'ativo' limit 1
$$;

-- ── Convites ────────────────────────────────────────────────────────────────
create table if not exists public.portal_convites (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null unique default gen_random_uuid(),
  aluno_id    uuid not null references public.alunos(id) on delete cascade,
  tipo        text not null check (tipo in ('criar', 'senha')),
  criado_por  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '7 days',
  usado_em    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists portal_convites_aluno on public.portal_convites (aluno_id, created_at desc);

alter table public.portal_convites enable row level security;
-- Staff da turma do atleta vê os convites; criar/usar é só pelo servidor (service role).
drop policy if exists "portal_convites_staff" on public.portal_convites;
create policy "portal_convites_staff" on public.portal_convites for select to authenticated
  using (public.treino_staff_pode(null, aluno_id));

-- ── O atleta vê o próprio cadastro e a própria turma ────────────────────────
drop policy if exists "alunos_select_proprio" on public.alunos;
create policy "alunos_select_proprio" on public.alunos for select to authenticated
  using (id = public.meu_aluno_id());

drop policy if exists "turmas_select_atleta" on public.turmas;
create policy "turmas_select_atleta" on public.turmas for select to authenticated
  using (id = public.minha_turma_id());

-- ── profiles: a equipe vê todos; os demais (atleta) só o próprio ────────────
-- Antes era `using (true)`: com contas de atleta, qualquer atleta leria e-mail,
-- papel e a assinatura desenhada de todos os usuários.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (public.get_my_role() in ('admin', 'coach') or id = auth.uid());
