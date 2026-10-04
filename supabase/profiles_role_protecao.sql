-- Protege profiles.role contra auto-promoção.
-- Run this in the Supabase SQL editor.
--
-- A policy "profiles_update_own" deixa cada usuário atualizar a própria linha
-- (para trocar nome/assinatura), mas sem restringir colunas: qualquer usuário
-- logado conseguia rodar, pelo navegador, `update profiles set role = 'admin'`
-- na própria linha e virar admin. Encontrado em 04/10/2026 (testado num banco
-- restaurado do backup, em transação desfeita).
--
-- Este trigger só deixa mudar `role` quem é admin (pelo app, com o JWT dele)
-- ou conexões de servidor (service role / postgres). É SECURITY INVOKER de
-- propósito: current_user é 'authenticated' quando a chamada vem do navegador.

create or replace function public.profiles_protege_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon')
     and coalesce(public.get_my_role(), '') <> 'admin' then
    raise exception 'Somente um administrador pode alterar o papel de um usuário.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protege_role on public.profiles;
create trigger profiles_protege_role
  before update of role on public.profiles
  for each row execute function public.profiles_protege_role();
