-- Run this in the Supabase SQL editor
-- Ficha de Inscrição Digital — ADTRISC

create table if not exists public.fichas_inscricao (
  id      uuid primary key default gen_random_uuid(),
  token   uuid not null unique default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  status  text not null default 'pendente'
          check (status in ('pendente', 'preenchida', 'expirada')),

  -- Participante (pre-filled from alunos, editable by parent)
  p_nome            text,
  p_telefone        text,
  p_sexo            text,
  p_data_nascimento date,
  p_rua             text,
  p_numero          text,
  p_bairro          text,
  p_cep             text,
  p_cidade          text,

  -- Mãe
  mae_nome     text,
  mae_cpf      text,
  mae_rg       text,
  mae_email    text,
  mae_telefone text,

  -- Pai
  pai_nome     text,
  pai_cpf      text,
  pai_rg       text,
  pai_email    text,
  pai_telefone text,

  -- Autorização
  responsavel_assina text,
  aceite_termos      boolean not null default false,
  assinatura_data    text,       -- base64 PNG

  -- Metadata
  gerado_por    uuid references public.profiles(id) on delete set null,
  gerado_em     timestamptz not null default now(),
  preenchido_em timestamptz,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists fichas_token_idx    on public.fichas_inscricao(token);
create index if not exists fichas_aluno_id_idx on public.fichas_inscricao(aluno_id);

-- updated_at trigger (reuses existing function set_updated_at)
drop trigger if exists fichas_inscricao_updated_at on public.fichas_inscricao;
create trigger fichas_inscricao_updated_at
  before update on public.fichas_inscricao
  for each row execute function public.set_updated_at();

-- RLS
alter table public.fichas_inscricao enable row level security;

create policy "fichas_select_staff" on public.fichas_inscricao
  for select to authenticated
  using (public.get_my_role() in ('admin', 'coach'));

create policy "fichas_write_admin" on public.fichas_inscricao
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');
