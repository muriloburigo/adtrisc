-- Segurança (AppSec, 08/10/2026): escopar por turma o acesso de COACH a dados
-- pessoais de menores e responsáveis. Antes, qualquer coach lia (e podia alterar)
-- CPF/RG/contato de TODOS os responsáveis e via TODOS os candidatos da escola,
-- não só os das suas turmas — fora do isolamento por turma que o resto do app aplica.
-- Admin continua vendo tudo. Atleta/responsável continuam vendo só o que é seu.
--
-- Recursão: a policy de `responsaveis` não pode consultar `aluno_responsavel` com
-- RLS (cuja policy consulta `responsaveis` de volta → loop). Usa-se a mesma técnica
-- de coach_has_aluno()/coach_has_turma(): função SECURITY DEFINER, que não passa
-- pela RLS. Titular e auxiliar contam igual (coach_has_turma).
-- Run this in the Supabase SQL editor — depois de aluno_responsavel_coach_fix.sql.

-- Coach tem acesso a um responsável se treina a turma de algum atleta vinculado a ele.
create or replace function public.coach_has_responsavel(p_resp_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.aluno_responsavel ar
    where ar.responsavel_id = p_resp_id and public.coach_has_aluno(ar.aluno_id)
  )
$$;

-- responsaveis: leitura e escrita do coach limitadas às suas turmas.
drop policy if exists "responsaveis_select_staff" on public.responsaveis;
create policy "responsaveis_select_staff" on public.responsaveis
  for select to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_responsavel(id));

drop policy if exists "responsaveis_update_coach" on public.responsaveis;
create policy "responsaveis_update_coach" on public.responsaveis
  for update to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_responsavel(id))
  with check (public.get_my_role() = 'admin' or public.coach_has_responsavel(id));

-- aluno_responsavel: o coach vê o vínculo só dos seus atletas; o responsável vê os seus.
drop policy if exists "aluno_responsavel_select" on public.aluno_responsavel;
create policy "aluno_responsavel_select" on public.aluno_responsavel
  for select to authenticated
  using (
    public.get_my_role() = 'admin'
    or public.coach_has_aluno(aluno_id)
    or responsavel_id in (select id from public.responsaveis where profile_id = auth.uid())
  );

-- candidatos: carregam CPF e dados de saúde do formulário público. Coach vê/edita só
-- os das suas turmas (null = sem turma = só admin). Admin, todos. Insert público segue aberto.
drop policy if exists "candidatos_select_staff" on public.candidatos;
create policy "candidatos_select_staff" on public.candidatos
  for select to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));

drop policy if exists "candidatos_update_staff" on public.candidatos;
create policy "candidatos_update_staff" on public.candidatos
  for update to authenticated
  using (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id))
  with check (public.get_my_role() = 'admin' or public.coach_has_turma(turma_id));
