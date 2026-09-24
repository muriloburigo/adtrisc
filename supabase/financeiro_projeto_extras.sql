-- Projeto financeiro: campos de objetivo/metas + anexos gerais do projeto
-- (plano de trabalho, convênio assinado, edital, etc. — separado do anexo
-- de cada nota fiscal, que já tem seu próprio storage_path em lancamentos_financeiros).
alter table public.projetos_financeiros add column if not exists objetivo text;
alter table public.projetos_financeiros add column if not exists metas text;

create table public.projeto_arquivos (
  id            uuid primary key default gen_random_uuid(),
  projeto_id    uuid not null references public.projetos_financeiros(id) on delete cascade,
  nome_arquivo  text not null,
  storage_path  text not null,
  enviado_por   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index projeto_arquivos_projeto_id_idx on public.projeto_arquivos(projeto_id);

alter table public.projeto_arquivos enable row level security;

create policy "projeto_arquivos_select" on public.projeto_arquivos
  for select to authenticated using (public.get_my_role() in ('admin','coach'));
create policy "projeto_arquivos_write" on public.projeto_arquivos
  for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- Bucket privado — anexos gerais do projeto, mesmo padrão de `notas-fiscais`/`documentos`.
insert into storage.buckets (id, name, public)
values ('financeiro-arquivos', 'financeiro-arquivos', false)
on conflict (id) do nothing;
