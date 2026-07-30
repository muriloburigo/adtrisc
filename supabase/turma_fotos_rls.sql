-- turma_fotos tinha RLS ativado mas nenhuma policy — nenhuma linha era
-- visível pelo client normal do app (só funcionava via client admin).
-- Reaproveita coach_has_turma() já usada em turmas/alunos/presenças.
create policy "turma_fotos_select" on public.turma_fotos
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

create policy "turma_fotos_write" on public.turma_fotos
  for all to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id))
  with check (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));
