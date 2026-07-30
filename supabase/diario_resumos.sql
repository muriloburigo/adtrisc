-- "Resumo do mês" (+ cidade/processo) do Diário de Aulas não tinha nenhuma
-- persistência real — só existiam como parâmetro de URL e rascunho de
-- localStorage. Uma linha por treinador+mês.
create table if not exists public.diario_resumos (
  coach_id   uuid not null references public.profiles(id) on delete cascade,
  ano        int  not null,
  mes        int  not null,
  cidade     text,
  processo   text,
  resumo     text,
  updated_at timestamptz not null default now(),
  primary key (coach_id, ano, mes)
);

alter table public.diario_resumos enable row level security;

create policy "diario_resumos_select" on public.diario_resumos
  for select to authenticated using (
    public.get_my_role() = 'admin' or coach_id = auth.uid()
  );

create policy "diario_resumos_write" on public.diario_resumos
  for all to authenticated
  using (public.get_my_role() = 'admin' or coach_id = auth.uid())
  with check (public.get_my_role() = 'admin' or coach_id = auth.uid());
