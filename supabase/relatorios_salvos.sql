-- Relatórios salvos da página /relatorios: cada usuário (admin ou treinador)
-- guarda combinações de filtros/colunas/ordem com um nome, para reabrir depois.
-- São pessoais: cada um vê e mexe só nos próprios. `estado` é o mesmo JSON que
-- a página guarda no parâmetro ?r= da URL.
-- Run this in the Supabase SQL editor.
create table if not exists public.relatorios_salvos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  nome       text not null check (char_length(btrim(nome)) between 1 and 80),
  estado     jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

alter table public.relatorios_salvos enable row level security;

create policy "relatorios_salvos_proprios" on public.relatorios_salvos
  for all to authenticated
  using (user_id = auth.uid() and public.get_my_role() in ('admin', 'coach'))
  with check (user_id = auth.uid() and public.get_my_role() in ('admin', 'coach'));
