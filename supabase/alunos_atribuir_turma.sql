-- Permite atribuir um atleta já cadastrado, mas sem turma (turma_id null),
-- a uma turma existente. Dois pontos:
--
-- 1. Visibilidade: hoje alunos_select_staff só deixa o coach enxergar
--    atletas de turmas que ele gerencia (coach_has_turma(turma_id)), e
--    coach_has_turma(null) nunca é verdadeiro — então nenhum coach conseguia
--    ver quem está sem turma. Adiciona uma policy extra (permissiva, soma
--    via OR) liberando esse caso pra todo coach, não só admin.
--
-- 2. Escrita: diferente da remoção (alunos_coach_remove.sql), atribuir uma
--    turma a um atleta sem turma NÃO esbarra na peculiaridade de RLS onde o
--    RETURNING falha — aqui a linha nova passa a ter turma_id = turma do
--    coach, e alunos_select_staff (coach_has_turma) já cobre isso. Não
--    precisa de função SECURITY DEFINER, só uma policy de UPDATE comum.

create policy "alunos_select_sem_turma" on public.alunos
  for select to authenticated
  using (public.get_my_role() = 'coach' and turma_id is null);

create policy "alunos_update_atribuir_turma" on public.alunos
  for update to authenticated
  using (public.get_my_role() = 'coach' and turma_id is null)
  with check (public.coach_has_turma(turma_id));
