-- Run this in the Supabase SQL editor
-- turma_fotos existed only as a table created manually in the dashboard —
-- never had a CREATE TABLE migration. Documenting it here (schema matches
-- production as of 2026-09) so a from-scratch restore doesn't break on
-- turma_fotos_rls.sql / turma_fotos_uma_por_dia.sql, which both assume this
-- table already exists.

create table if not exists public.turma_fotos (
  id            uuid primary key default gen_random_uuid(),
  turma_id      uuid not null references public.turmas(id) on delete cascade,
  url           text not null,
  storage_path  text not null,
  titulo        text not null,
  data          date not null default current_date,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  file_hash     text,
  created_at    timestamptz not null default now()
);

alter table public.turma_fotos enable row level security;
-- Policies are added by turma_fotos_rls.sql (run that next).
