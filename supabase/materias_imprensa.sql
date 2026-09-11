-- Run this in the Supabase SQL editor
-- Matérias de imprensa — links de notícias/matérias onde a ADTRISC foi citada,
-- com preview reduzido (título, descrição, imagem) capturado no momento do cadastro.

create table if not exists public.materias_imprensa (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  titulo      text,
  descricao   text,
  imagem_url  text,
  site        text,
  criado_por  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_materias_imprensa_created_at on public.materias_imprensa(created_at desc);

-- --------------------------------------------------------
-- RLS — mesmo escopo de provas: dado compartilhado (não pertence a uma
-- turma específica), qualquer staff (admin ou coach) pode ler/gerenciar.
-- --------------------------------------------------------
alter table public.materias_imprensa enable row level security;

create policy "materias_imprensa_select_staff" on public.materias_imprensa
  for select to authenticated using (public.get_my_role() in ('admin', 'coach'));
create policy "materias_imprensa_write_staff" on public.materias_imprensa
  for all to authenticated
  using (public.get_my_role() in ('admin', 'coach'))
  with check (public.get_my_role() in ('admin', 'coach'));
