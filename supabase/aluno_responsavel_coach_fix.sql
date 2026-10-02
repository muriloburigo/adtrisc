-- Corrige "infinite recursion detected in policy for relation aluno_responsavel"
-- quando um TREINADOR vincula um responsável a um atleta (cadastro/edição do
-- atleta). A policy de insert consultava `alunos` com RLS, e a policy
-- alunos_select_pai consulta `aluno_responsavel` de volta → loop. O vínculo
-- falhava em silêncio (o responsável ficava salvo, mas sem ligação ao atleta).
-- Mesma técnica de coach_has_turma(): função SECURITY DEFINER, sem passar
-- pela RLS de alunos. Titular e auxiliar contam igual (coach_has_turma).
-- Run this in the Supabase SQL editor.
create or replace function public.coach_has_aluno(p_aluno_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.alunos a where a.id = p_aluno_id and public.coach_has_turma(a.turma_id))
$$;

drop policy if exists "aluno_responsavel_insert_coach" on public.aluno_responsavel;
create policy "aluno_responsavel_insert_coach" on public.aluno_responsavel
  for insert to authenticated
  with check (public.get_my_role() = 'admin' or public.coach_has_aluno(aluno_id));
