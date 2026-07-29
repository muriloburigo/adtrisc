-- Treinadores auxiliares por turma (coach_id em turmas continua sendo o principal)
create table if not exists public.turma_coaches (
  turma_id   uuid not null references public.turmas(id) on delete cascade,
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (turma_id, coach_id)
);
create index if not exists turma_coaches_coach_id_idx on public.turma_coaches(coach_id);

alter table public.turma_coaches enable row level security;

create policy "turma_coaches_select" on public.turma_coaches
  for select to authenticated using (true);
create policy "turma_coaches_write" on public.turma_coaches
  for all to authenticated
  using (public.get_my_role() in ('admin', 'coach'))
  with check (public.get_my_role() in ('admin', 'coach'));
