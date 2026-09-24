-- Módulo Financeiro: projetos (editais/patrocínios) com orçamento por categoria,
-- e notas fiscais lançadas por cada treinador. Competência = ano do projeto.
create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.projetos_financeiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano int not null,
  descricao text,
  ativo boolean not null default true,
  criado_por uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index projetos_financeiros_ano_idx on public.projetos_financeiros(ano);

create table public.orcamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_financeiros(id) on delete cascade,
  categoria_id uuid not null references public.categorias_financeiras(id) on delete restrict,
  valor_orcado numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (projeto_id, categoria_id)
);

-- Notas fiscais lançadas pelos treinadores contra o orçamento de um projeto/categoria.
create table public.lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos_financeiros(id) on delete restrict,
  categoria_id uuid not null references public.categorias_financeiras(id) on delete restrict,
  coach_id uuid not null references public.profiles(id),
  valor numeric(12,2) not null check (valor > 0),
  descricao text not null,
  numero_nota text,
  data date not null,
  nome_arquivo text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lancamentos_financeiros_projeto_idx on public.lancamentos_financeiros(projeto_id);
create index lancamentos_financeiros_coach_idx on public.lancamentos_financeiros(coach_id);

alter table public.categorias_financeiras   enable row level security;
alter table public.projetos_financeiros     enable row level security;
alter table public.orcamentos_financeiros   enable row level security;
alter table public.lancamentos_financeiros  enable row level security;

-- Leitura liberada pra todo staff (admin+coach) nas 4 tabelas — precisa pra
-- visão de orçamento consolidada do coach mostrar o total consumido por
-- todos os treinadores, não só o dele.
create policy "categorias_financeiras_select" on public.categorias_financeiras
  for select to authenticated using (public.get_my_role() in ('admin','coach'));
create policy "projetos_financeiros_select" on public.projetos_financeiros
  for select to authenticated using (public.get_my_role() in ('admin','coach'));
create policy "orcamentos_financeiros_select" on public.orcamentos_financeiros
  for select to authenticated using (public.get_my_role() in ('admin','coach'));
create policy "lancamentos_financeiros_select" on public.lancamentos_financeiros
  for select to authenticated using (public.get_my_role() in ('admin','coach'));

-- Escrita de categorias/projetos/orçamento: só admin.
create policy "categorias_financeiras_write" on public.categorias_financeiras
  for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "projetos_financeiros_write" on public.projetos_financeiros
  for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "orcamentos_financeiros_write" on public.orcamentos_financeiros
  for all to authenticated
  using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- Escrita de lançamentos: admin, ou o próprio treinador dono da nota.
create policy "lancamentos_financeiros_write" on public.lancamentos_financeiros
  for all to authenticated
  using (public.get_my_role() = 'admin' or coach_id = auth.uid())
  with check (public.get_my_role() = 'admin' or coach_id = auth.uid());

-- Bucket privado — anexos das notas fiscais, acesso só via service role
-- (server actions), download por signed URL de curta duração (mesmo padrão
-- do bucket `documentos`).
insert into storage.buckets (id, name, public)
values ('notas-fiscais', 'notas-fiscais', false)
on conflict (id) do nothing;
