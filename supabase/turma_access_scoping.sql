-- Restringe treinadores (principal ou auxiliar) a só ver/mexer nas turmas
-- em que estão vinculados. Admin continua irrestrito em tudo.

create or replace function public.coach_has_turma(p_turma_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.turmas t where t.id = p_turma_id and t.coach_id = auth.uid())
      or exists (select 1 from public.turma_coaches tc where tc.turma_id = p_turma_id and tc.coach_id = auth.uid())
$$;

-- --------------------------------------------------------
-- turmas
-- --------------------------------------------------------
drop policy if exists "turmas_select" on public.turmas;
create policy "turmas_select" on public.turmas
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(id)
  );

drop policy if exists "turmas_insert" on public.turmas;
create policy "turmas_insert" on public.turmas
  for insert to authenticated with check (public.get_my_role() = 'admin');

drop policy if exists "turmas_update" on public.turmas;
create policy "turmas_update" on public.turmas
  for update to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(id)
  );

-- turmas_delete já é admin-only, sem mudança.

-- --------------------------------------------------------
-- turma_coaches
-- --------------------------------------------------------
drop policy if exists "turma_coaches_select" on public.turma_coaches;
create policy "turma_coaches_select" on public.turma_coaches
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

drop policy if exists "turma_coaches_write" on public.turma_coaches;
create policy "turma_coaches_write" on public.turma_coaches
  for all to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id))
  with check (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));

-- --------------------------------------------------------
-- alunos (só a leitura muda — escrita já era admin-only)
-- --------------------------------------------------------
drop policy if exists "alunos_select_staff" on public.alunos;
create policy "alunos_select_staff" on public.alunos
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

-- --------------------------------------------------------
-- presencas
-- --------------------------------------------------------
drop policy if exists "Staff lê presenças" on public.presencas;
create policy "Staff lê presenças" on public.presencas
  for select to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

drop policy if exists "Staff registra presenças" on public.presencas;
create policy "Staff registra presenças" on public.presencas
  for insert to authenticated with check (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

drop policy if exists "Staff atualiza presenças" on public.presencas;
create policy "Staff atualiza presenças" on public.presencas
  for update to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

drop policy if exists "Staff exclui presenças" on public.presencas;
create policy "Staff exclui presenças" on public.presencas
  for delete to authenticated using (
    public.get_my_role() = 'admin' or public.coach_has_turma(turma_id)
  );

-- --------------------------------------------------------
-- avaliacoes_fisicas (via aluno_id -> alunos.turma_id)
-- --------------------------------------------------------
drop policy if exists "Staff lê avaliações" on public.avaliacoes_fisicas;
create policy "Staff lê avaliações" on public.avaliacoes_fisicas
  for select to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );

drop policy if exists "Staff insere/atualiza avaliações" on public.avaliacoes_fisicas;
create policy "Staff insere/atualiza avaliações" on public.avaliacoes_fisicas
  for insert to authenticated with check (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );

drop policy if exists "Staff atualiza avaliações" on public.avaliacoes_fisicas;
create policy "Staff atualiza avaliações" on public.avaliacoes_fisicas
  for update to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );

drop policy if exists "Admin exclui avaliações" on public.avaliacoes_fisicas;
create policy "Admin exclui avaliações" on public.avaliacoes_fisicas
  for delete to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );

-- --------------------------------------------------------
-- historico_atleta (estava sem checagem alguma de papel/vínculo)
-- --------------------------------------------------------
drop policy if exists "hist_leitura" on public.historico_atleta;
create policy "hist_leitura" on public.historico_atleta
  for select to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );

drop policy if exists "hist_insercao" on public.historico_atleta;
create policy "hist_insercao" on public.historico_atleta
  for insert to authenticated with check (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );
