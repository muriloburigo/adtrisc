-- Documentos assinados (relatório da turma / lista de presença) enviados
-- de volta ao sistema após assinatura digital via gov.br.
create table if not exists public.documentos_assinados (
  id            uuid primary key default gen_random_uuid(),
  turma_id      uuid not null references public.turmas(id) on delete cascade,
  tipo          text not null check (tipo in ('relatorio_turma', 'presenca_exportar')),
  periodo       text not null, -- "2026-07" (relatório da turma) ou "2026-07-01_2026-07-31" (exportar presenças)
  nome_arquivo  text not null,
  storage_path  text not null,
  enviado_por   uuid references public.profiles(id),
  enviado_em    timestamptz not null default now()
);
create index if not exists documentos_assinados_turma_id_idx on public.documentos_assinados(turma_id);

alter table public.documentos_assinados enable row level security;

create policy "documentos_assinados_select" on public.documentos_assinados
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );
create policy "documentos_assinados_write" on public.documentos_assinados
  for all to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id))
  with check (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));

-- Bucket privado — acesso só via client de service role (server actions),
-- download por signed URL de curta duração.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;
