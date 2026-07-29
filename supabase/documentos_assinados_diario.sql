-- Estende documentos_assinados para aceitar documentos do Diário de Aulas,
-- que é vinculado ao treinador (coach_id), não a uma turma específica.
alter table public.documentos_assinados alter column turma_id drop not null;
alter table public.documentos_assinados
  add column if not exists coach_id uuid references public.profiles(id) on delete cascade;

alter table public.documentos_assinados drop constraint if exists documentos_assinados_tipo_check;
alter table public.documentos_assinados add constraint documentos_assinados_tipo_check
  check (tipo in ('relatorio_turma', 'presenca_exportar', 'diario_aula'));

drop policy if exists "documentos_assinados_select" on public.documentos_assinados;
create policy "documentos_assinados_select" on public.documentos_assinados
  for select to authenticated using (
    public.get_my_role() = 'admin'
    or (turma_id is not null and public.coach_has_turma(turma_id))
    or (coach_id is not null and coach_id = auth.uid())
  );

drop policy if exists "documentos_assinados_write" on public.documentos_assinados;
create policy "documentos_assinados_write" on public.documentos_assinados
  for all to authenticated
  using (
    public.get_my_role() = 'admin'
    or (turma_id is not null and public.coach_has_turma(turma_id))
    or (coach_id is not null and coach_id = auth.uid())
  )
  with check (
    public.get_my_role() = 'admin'
    or (turma_id is not null and public.coach_has_turma(turma_id))
    or (coach_id is not null and coach_id = auth.uid())
  );
