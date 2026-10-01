-- Transferências de atletas entre turmas de treinadores diferentes.
-- Quem tem acesso às duas turmas (titular ou auxiliar, ou admin) muda direto;
-- senão vira um pedido que o outro lado aceita ou recusa:
--   tipo 'envio'       = o treinador da turma de origem enviou → destino responde
--   tipo 'solicitacao' = o treinador da turma de destino pediu  → origem responde
-- Escrita só pelas server actions (service role); a leitura é de quem está
-- de um dos lados (coach_has_turma) ou admin.
-- Run this in the Supabase SQL editor. Precisa de coach_has_turma()
-- (turma_access_scoping.sql).
create table if not exists public.transferencias (
  id               uuid primary key default gen_random_uuid(),
  aluno_id         uuid not null references public.alunos(id) on delete cascade,
  turma_origem_id  uuid references public.turmas(id) on delete set null,
  turma_destino_id uuid not null references public.turmas(id) on delete cascade,
  tipo             text not null check (tipo in ('envio', 'solicitacao')),
  status           text not null default 'pendente'
                   check (status in ('pendente', 'aceita', 'recusada', 'cancelada', 'expirada')),
  observacao       text check (observacao is null or char_length(observacao) <= 500),
  criado_por       uuid references public.profiles(id) on delete set null,
  criado_em        timestamptz not null default now(),
  expira_em        timestamptz not null default now() + interval '15 days',
  respondido_por   uuid references public.profiles(id) on delete set null,
  respondido_em    timestamptz,
  motivo_recusa    text check (motivo_recusa is null or char_length(motivo_recusa) <= 500)
);

-- No máximo um pedido em aberto por atleta.
create unique index if not exists transferencias_uma_pendente_por_aluno
  on public.transferencias (aluno_id) where status = 'pendente';
create index if not exists transferencias_destino_idx on public.transferencias (turma_destino_id) where status = 'pendente';
create index if not exists transferencias_origem_idx on public.transferencias (turma_origem_id) where status = 'pendente';

alter table public.transferencias enable row level security;

create policy "transferencias_select" on public.transferencias
  for select to authenticated using (
    public.get_my_role() = 'admin'
    or public.coach_has_turma(turma_origem_id)
    or public.coach_has_turma(turma_destino_id)
  );
