-- Permite que o coach remova (desliga) alunos das turmas em que está vinculado.
-- alunos_write (schema_v2.sql:178-181) continua admin-only para create/update geral
-- e delete. Esta policy adicional cobre só o UPDATE feito por removerAlunoTurma()
-- (app/(dashboard)/alunos/actions.ts), que seta turma_id = null e status = 'desligado'.
--
-- USING roda sobre a linha atual: só libera se a turma atual do aluno é do coach.
-- WITH CHECK roda sobre a linha nova: só libera se o resultado é exatamente um
-- desligamento (turma_id nulo + status desligado) — não abre edição geral do aluno.
drop policy if exists "alunos_coach_remove" on public.alunos;
create policy "alunos_coach_remove" on public.alunos
  for update to authenticated
  using (public.coach_has_turma(turma_id))
  with check (turma_id is null and status = 'desligado');
