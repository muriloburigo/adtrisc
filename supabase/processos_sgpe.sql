-- Processos SGPE por projeto e ano (antes digitados à mão em cada relatório e
-- fixos no código da ficha). Cada turma pode apontar para o seu; sem isso, usa
-- o processo do ano quando o ano tem um só (lib/processoSgpe.ts).
-- Run this in the Supabase SQL editor.
create table if not exists public.processos_sgpe (
  id         uuid primary key default gen_random_uuid(),
  projeto    text not null check (char_length(btrim(projeto)) between 1 and 120),
  ano        int  not null check (ano between 2000 and 2100),
  processo   text not null check (char_length(btrim(processo)) between 1 and 80), -- ex.: "FESPORTE 5217/2025"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ano, projeto)
);

alter table public.processos_sgpe enable row level security;

create policy "processos_sgpe_select" on public.processos_sgpe
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));

create policy "processos_sgpe_write" on public.processos_sgpe
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

alter table public.turmas
  add column if not exists processo_sgpe_id uuid references public.processos_sgpe(id) on delete set null;

-- O processo que estava fixo na ficha de inscrição (turmas de 2026).
insert into public.processos_sgpe (projeto, ano, processo)
values ('Escolinha de Triathlon São José', 2026, 'FESPORTE 5217/2025')
on conflict (ano, projeto) do nothing;
