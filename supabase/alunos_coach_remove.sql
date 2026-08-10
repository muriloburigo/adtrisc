-- Permite que o coach remova (desligue) alunos das turmas em que está vinculado.
--
-- Tentativa inicial: uma policy UPDATE (using coach_has_turma / with check
-- turma_id is null) parecia correta, mas o Postgres recusa qualquer UPDATE
-- cujo resultado o próprio autor deixe de enxergar via policy de SELECT —
-- e como alunos_select_staff depende de coach_has_turma(turma_id), zerar
-- turma_id sempre produz "new row violates row-level security policy",
-- mesmo com uma policy UPDATE permissiva. O mesmo aconteceria no insert em
-- historico_atleta logo em seguida (hist_insercao também depende do
-- turma_id, que já estaria nulo).
--
-- Correção: a remoção roda inteira dentro de uma função SECURITY DEFINER
-- (mesmo padrão de get_my_role()/coach_has_turma()), que valida a permissão
-- manualmente e escreve com privilégio elevado, contornando essa peculiaridade
-- do RLS em vez de tentar modelá-la via policy.
drop policy if exists "alunos_coach_remove" on public.alunos;

create or replace function public.remover_aluno_turma(p_aluno_id uuid)
returns table (
  nome text,
  turma_anterior_id uuid,
  turma_anterior_nome text,
  status_anterior text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before record;
  v_turma_nome text;
begin
  select a.nome, a.turma_id, a.status into v_before
  from public.alunos a where a.id = p_aluno_id;

  if v_before is null then
    raise exception 'Atleta não encontrado';
  end if;

  if public.get_my_role() <> 'admin' and not public.coach_has_turma(v_before.turma_id) then
    raise exception 'Acesso negado';
  end if;

  if v_before.turma_id is not null then
    select t.nome into v_turma_nome from public.turmas t where t.id = v_before.turma_id;
  end if;

  update public.alunos
    set turma_id = null, status = 'desligado'
    where id = p_aluno_id;

  insert into public.historico_atleta (aluno_id, tipo, data, turma_id, turma_nome, turma_anterior_id, turma_anterior_nome)
  values (p_aluno_id, 'desligamento', current_date, null, null, v_before.turma_id, v_turma_nome);

  return query select v_before.nome, v_before.turma_id, v_turma_nome, v_before.status;
end;
$$;

grant execute on function public.remover_aluno_turma(uuid) to authenticated;
