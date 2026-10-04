-- Integração com o Intervals.icu (→ Garmin, Polar, Coros…): conexão OAuth por atleta.
-- Run this in the Supabase SQL editor — after treinos.sql and portal_atleta.sql.
--
-- O atleta conecta o Intervals no portal (app OAuth "ADTRISC"); o token não
-- expira e fica CIFRADO (AES-256-GCM, chave INTERVALS_TOKEN_KEY só no servidor).
-- Escritas só pelo servidor (service role). A coluna do token não é legível
-- por nenhum usuário logado, nem staff, nem o próprio atleta.

create table if not exists public.intervals_conexoes (
  id                    uuid primary key default gen_random_uuid(),
  aluno_id              uuid not null unique references public.alunos(id) on delete cascade,
  intervals_athlete_id  text not null,
  token_cifrado         text not null,
  escopo                text,
  conectado_em          timestamptz not null default now(),
  ultima_sincronizacao  timestamptz,
  ultimo_erro           text
);
create index if not exists intervals_conexoes_atleta_icu on public.intervals_conexoes (intervals_athlete_id);

alter table public.intervals_conexoes enable row level security;

drop policy if exists "intervals_conexoes_staff" on public.intervals_conexoes;
create policy "intervals_conexoes_staff" on public.intervals_conexoes for select to authenticated
  using (public.treino_staff_pode(null, aluno_id));
drop policy if exists "intervals_conexoes_atleta" on public.intervals_conexoes;
create policy "intervals_conexoes_atleta" on public.intervals_conexoes for select to authenticated
  using (aluno_id = public.meu_aluno_id());

-- Só as colunas de status são legíveis pelo navegador; o token, nunca.
revoke all on public.intervals_conexoes from anon, authenticated;
grant select (id, aluno_id, intervals_athlete_id, escopo, conectado_em, ultima_sincronizacao, ultimo_erro)
  on public.intervals_conexoes to authenticated;
