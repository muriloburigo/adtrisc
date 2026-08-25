-- Libera o coach a: (1) editar os dados de atletas das turmas que ele
-- gerencia, (2) cadastrar atleta novo sem escolher turma na hora (fica
-- "sem turma", igual um atleta desligado). Escrita em alunos continuava
-- admin-only fora do que já foi liberado em alunos_coach_insert.sql
-- (só INSERT com turma_id do próprio coach) e alunos_atribuir_turma.sql
-- (só UPDATE de turma_id nulo → turma do coach).

-- 1. INSERT: além de turma_id do próprio coach, permite turma_id nulo
--    (cadastro de atleta "sem turma" — mesmo caso já visível/atribuível
--    a qualquer coach desde alunos_atribuir_turma.sql).
drop policy if exists "alunos_insert_coach" on public.alunos;
create policy "alunos_insert_coach" on public.alunos
  for insert to authenticated
  with check (
    public.get_my_role() = 'admin'
    or public.coach_has_turma(turma_id)
    or (public.get_my_role() = 'coach' and turma_id is null)
  );

-- 2. UPDATE: edição geral de um atleta que já está numa turma do coach.
--    using() exige que a linha atual pertença a uma turma dele; with
--    check() exige que a linha resultante também — ou seja, dá pra
--    editar os dados normalmente, ou mover o atleta pra outra turma que
--    o coach também gerencia, mas não pra fora do que ele controla nem
--    pra turma_id nulo (isso é papel do RPC remover_aluno_turma, que
--    contorna a peculiaridade de RLS documentada em alunos_coach_remove.sql).
create policy "alunos_update_coach" on public.alunos
  for update to authenticated
  using (public.get_my_role() = 'coach' and public.coach_has_turma(turma_id))
  with check (public.get_my_role() = 'coach' and public.coach_has_turma(turma_id));

-- 3. responsaveis: a leitura já era liberada pra todo staff
--    (responsaveis_select_staff) e o insert também (responsaveis_insert_coach,
--    em alunos_coach_insert.sql); falta o update, usado quando o coach edita
--    o telefone/e-mail/etc. de um responsável já cadastrado.
create policy "responsaveis_update_coach" on public.responsaveis
  for update to authenticated
  using (public.get_my_role() = 'coach')
  with check (public.get_my_role() = 'coach');

-- 4. historico_atleta: leitura e inserção dependiam de coach_has_turma(turma_id),
--    que é sempre falso pra turma_id nulo — bloqueava tanto ver quanto escrever
--    o histórico de um atleta sem turma (ex.: ao cadastrá-lo).
drop policy if exists "hist_leitura" on public.historico_atleta;
create policy "hist_leitura" on public.historico_atleta
  for select to authenticated using (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and (
        public.coach_has_turma(a.turma_id) or (public.get_my_role() = 'coach' and a.turma_id is null)
      )
    )
  );

drop policy if exists "hist_insercao" on public.historico_atleta;
create policy "hist_insercao" on public.historico_atleta
  for insert to authenticated with check (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and (
        public.coach_has_turma(a.turma_id) or (public.get_my_role() = 'coach' and a.turma_id is null)
      )
    )
  );
