-- Permite que o coach cadastre atletas diretamente nas turmas em que está
-- vinculado (principal ou auxiliar), via /alunos/novo?turma=... (createAluno
-- em alunos/actions.ts). Escrita em alunos/responsaveis/aluno_responsavel
-- era admin-only (schema_v2.sql); aqui adicionamos policies PERMISSIVE só de
-- INSERT que somam (OR) com as existentes, sem tocar update/delete.
--
-- Ao contrário da remoção (alunos_coach_remove.sql), um INSERT simples não
-- esbarra na peculiaridade de RLS documentada lá: a linha nova já nasce com
-- turma_id = turma do coach, então alunos_select_staff (que depende de
-- coach_has_turma(turma_id)) permanece satisfeita para o RETURNING.

create policy "alunos_insert_coach" on public.alunos
  for insert to authenticated
  with check (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));

-- responsaveis não carrega turma_id (o vínculo é só via aluno_responsavel),
-- e a leitura já é liberada para todo staff (responsaveis_select_staff);
-- liberamos o INSERT no mesmo nível, mantendo update/delete admin-only.
create policy "responsaveis_insert_coach" on public.responsaveis
  for insert to authenticated
  with check (public.get_my_role() in ('admin', 'coach'));

create policy "aluno_responsavel_insert_coach" on public.aluno_responsavel
  for insert to authenticated
  with check (
    public.get_my_role() = 'admin' or exists (
      select 1 from public.alunos a where a.id = aluno_id and public.coach_has_turma(a.turma_id)
    )
  );
