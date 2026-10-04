-- Módulo de treinos (porte do módulo Training do Movelly Core — ver AGENTS.md).
-- Treino da TURMA (todos recebem) com AJUSTE INDIVIDUAL opcional; só turmas
-- com usa_treinos = true. Códigos dos enums iguais aos do Movelly (facilita o
-- porte da lógica, do FIT e do Intervals.icu); textos de tela em pt-BR no app.
-- Run this in the Supabase SQL editor. Precisa de coach_has_turma() e
-- coach_has_aluno() (turma_access_scoping.sql, aluno_responsavel_coach_fix.sql).

-- ── Turma: liga/desliga o módulo ────────────────────────────────────────────
alter table public.turmas add column if not exists usa_treinos boolean not null default false;
update public.turmas set usa_treinos = true
where nome in ('Pré equipe', 'Equipe Triathlon') or nome ilike 'Equipe Nata%';

-- ── Helpers de acesso (SECURITY DEFINER: sem recursão entre policies) ──────
-- id do atleta ligado ao usuário logado (portal do atleta), ou null.
create or replace function public.meu_aluno_id()
returns uuid language sql security definer stable set search_path = public as $$
  select id from public.alunos where profile_id = auth.uid() limit 1
$$;

create or replace function public.minha_turma_id()
returns uuid language sql security definer stable set search_path = public as $$
  select turma_id from public.alunos where profile_id = auth.uid() limit 1
$$;

-- Staff que pode mexer no treino de uma turma ou de um atleta (titular = auxiliar).
create or replace function public.treino_staff_pode(p_turma_id uuid, p_aluno_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.get_my_role() = 'admin'
      or (p_turma_id is not null and public.coach_has_turma(p_turma_id))
      or (p_aluno_id is not null and public.coach_has_aluno(p_aluno_id))
$$;

-- ── Biblioteca ──────────────────────────────────────────────────────────────
create table if not exists public.treino_pastas (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (char_length(btrim(nome)) between 1 and 80),
  ordem      int  not null default 0,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.treino_modelos (
  id                uuid primary key default gen_random_uuid(),
  pasta_id          uuid references public.treino_pastas(id) on delete set null,
  titulo            text not null check (char_length(btrim(titulo)) between 1 and 120),
  modalidade        text not null default 'running'
                    check (modalidade in ('running','cycling','swimming','strength','other')),
  tipo              text not null default 'base'
                    check (tipo in ('base','long','interval','recovery','technique','strength','race_simulation','brick')),
  duracao_min       int,
  distancia_km      numeric(8,2),
  intensidade_tipo  text check (intensidade_tipo in ('open','rpe','zone','pace','heart_rate','power')),
  intensidade_alvo  text,
  local             text,
  notas             text,
  criado_por        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Planos ──────────────────────────────────────────────────────────────────
create table if not exists public.treino_planos (
  id                 uuid primary key default gen_random_uuid(),
  turma_id           uuid references public.turmas(id) on delete cascade,
  aluno_id           uuid references public.alunos(id) on delete cascade,
  titulo             text not null,
  objetivo           text not null default 'manual'
                     check (objetivo in ('manual','base','endurance','speed','race_specific','recovery')),
  modo_geracao       text not null default 'manual' check (modo_geracao in ('manual','automatic')),
  status             text not null default 'rascunho' check (status in ('rascunho','publicado')),
  inicio             date not null,
  fim                date not null,
  prova_alvo_data    date,
  prova_alvo_nome    text,
  sessoes_semana     smallint,
  dias_disponiveis   smallint[],          -- ISO: 1=segunda … 7=domingo
  dificuldade        text check (dificuldade in ('beginner','intermediate','advanced','performance')),
  distancia_alvo_km  numeric(8,2),
  notas              text,
  payload_gerador    jsonb,
  publicado_em       timestamptz,
  publicado_por      uuid references public.profiles(id) on delete set null,
  criado_por         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check ((turma_id is not null) <> (aluno_id is not null)),
  check (fim >= inicio)
);

-- ── Sessões (treino de um dia) ──────────────────────────────────────────────
-- turma_id = treino da turma · aluno_id + sessao_origem_id = ajuste individual
-- (substitui o da turma para aquele atleta) · só aluno_id = treino individual extra.
create table if not exists public.treino_sessoes (
  id                uuid primary key default gen_random_uuid(),
  plano_id          uuid references public.treino_planos(id) on delete cascade,
  turma_id          uuid references public.turmas(id) on delete cascade,
  aluno_id          uuid references public.alunos(id) on delete cascade,
  sessao_origem_id  uuid references public.treino_sessoes(id) on delete cascade,
  data              date not null,
  ordem             smallint not null default 1,
  titulo            text not null check (char_length(btrim(titulo)) between 1 and 120),
  tipo              text not null default 'base'
                    check (tipo in ('base','long','interval','recovery','technique','strength','race_simulation','brick')),
  modalidade        text not null default 'running'
                    check (modalidade in ('running','cycling','swimming','strength','other')),
  duracao_min       int,
  distancia_km      numeric(8,2),
  carga             numeric(8,2),
  intensidade_tipo  text check (intensidade_tipo in ('open','rpe','zone','pace','heart_rate','power')),
  intensidade_alvo  text,
  local             text,
  chave             boolean not null default false,   -- sessão-chave
  notas             text,
  status            text not null default 'rascunho' check (status in ('rascunho','publicado')),
  publicado_em      timestamptz,
  criado_por        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (turma_id is not null or aluno_id is not null),
  check (sessao_origem_id is null or aluno_id is not null)
);
create unique index if not exists treino_sessoes_um_ajuste_por_atleta
  on public.treino_sessoes (sessao_origem_id, aluno_id) where sessao_origem_id is not null;
create index if not exists treino_sessoes_turma_data on public.treino_sessoes (turma_id, data);
create index if not exists treino_sessoes_aluno_data on public.treino_sessoes (aluno_id, data);

-- ── Passos (sessão e modelo da biblioteca têm a mesma estrutura) ────────────
-- Igual a training_steps do Movelly. Repetição: o passo de esforço tem
-- repeticoes > 1 e o passo seguinte do tipo 'recovery' é o descanso de cada rep.
-- alvo_unidade = 'zone' → alvo_min é o número da zona (1–5, zonas da ADTRISC).
create table if not exists public.treino_passos (
  id                uuid primary key default gen_random_uuid(),
  sessao_id         uuid references public.treino_sessoes(id) on delete cascade,
  modelo_id         uuid references public.treino_modelos(id) on delete cascade,
  ordem             smallint not null default 1,
  tipo              text not null default 'work'
                    check (tipo in ('warmup','work','recovery','cooldown','drill','strength','note')),
  titulo            text not null default '',
  duracao_s         int check (duracao_s is null or duracao_s >= 0),
  distancia_m       int check (distancia_m is null or distancia_m >= 0),
  intensidade_tipo  text check (intensidade_tipo in ('open','rpe','zone','pace','heart_rate','power')),
  alvo_min          numeric(8,2),
  alvo_max          numeric(8,2),
  alvo_unidade      text,               -- 'zone' | 'pace' (s/km ou s/100m) | 'bpm' | 'w' | 'rpe' | 'kmh'
  grupo_repeticao   smallint,
  repeticoes        smallint check (repeticoes is null or repeticoes >= 1),
  aberto            boolean not null default false,   -- termina quando o atleta apertar volta
  notas             text,
  check ((sessao_id is not null) <> (modelo_id is not null))
);
create index if not exists treino_passos_sessao on public.treino_passos (sessao_id, ordem);
create index if not exists treino_passos_modelo on public.treino_passos (modelo_id, ordem);

-- ── Entrega por atleta (status, envio ao Intervals) ─────────────────────────
create table if not exists public.treino_entregas (
  id                  uuid primary key default gen_random_uuid(),
  sessao_id           uuid not null references public.treino_sessoes(id) on delete cascade,
  aluno_id            uuid not null references public.alunos(id) on delete cascade,
  situacao            text not null default 'planejado' check (situacao in ('planejado','feito','nao_feito','parcial')),
  marcado_por         text check (marcado_por in ('atleta','treinador','auto')),
  marcado_em          timestamptz,
  intervals_event_id  text,
  enviado_em          timestamptz,
  erro_envio          text,
  created_at          timestamptz not null default now(),
  unique (sessao_id, aluno_id)
);

-- ── Execuções (o que foi feito) ─────────────────────────────────────────────
create table if not exists public.treino_execucoes (
  id                     uuid primary key default gen_random_uuid(),
  entrega_id             uuid references public.treino_entregas(id) on delete set null,  -- null = atividade extra
  aluno_id               uuid not null references public.alunos(id) on delete cascade,
  origem                 text not null default 'manual' check (origem in ('intervals','upload','manual')),
  atividade_externa_id   text,
  modalidade             text,
  titulo                 text,
  executado_em           timestamptz not null,
  duracao_s              int,
  distancia_m            numeric(10,2),
  fc_media               smallint,
  fc_max                 smallint,
  pace_medio_s_km        int,
  velocidade_media_ms    numeric(8,4),
  cadencia_media         smallint,
  elevacao_m             smallint,
  potencia_media_w       smallint,
  calorias               smallint,
  tss                    numeric(6,2),
  zonas                  jsonb,      -- tempo por zona
  dados                  jsonb,
  arquivo_fit            text,       -- caminho no Storage
  created_at             timestamptz not null default now(),
  unique (aluno_id, origem, atividade_externa_id)
);
create index if not exists treino_execucoes_aluno_data on public.treino_execucoes (aluno_id, executado_em);

-- ── Limiares do atleta (base para zonas e paces) ────────────────────────────
-- Sem limiar cadastrado, o app usa os testes da ADTRISC (Dabonneville 5' /
-- ciclismo 2 km) via lib/zonas.ts.
create table if not exists public.atleta_limiares (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references public.alunos(id) on delete cascade,
  modalidade      text not null check (modalidade in ('running','cycling','swimming')),
  pace_s          int,          -- corrida: s/km de referência (100%); natação: s/100m
  velocidade_kmh  numeric(5,2), -- ciclismo: km/h de referência (100%)
  ftp_w           smallint,
  fc_max          smallint,
  fc_limiar       smallint,
  atualizado_por  uuid references public.profiles(id) on delete set null,
  updated_at      timestamptz not null default now(),
  unique (aluno_id, modalidade)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.treino_pastas    enable row level security;
alter table public.treino_modelos   enable row level security;
alter table public.treino_planos    enable row level security;
alter table public.treino_sessoes   enable row level security;
alter table public.treino_passos    enable row level security;
alter table public.treino_entregas  enable row level security;
alter table public.treino_execucoes enable row level security;
alter table public.atleta_limiares  enable row level security;

-- Biblioteca: compartilhada entre staff.
create policy "treino_pastas_staff" on public.treino_pastas for all to authenticated
  using (public.get_my_role() in ('admin','coach')) with check (public.get_my_role() in ('admin','coach'));
create policy "treino_modelos_staff" on public.treino_modelos for all to authenticated
  using (public.get_my_role() in ('admin','coach')) with check (public.get_my_role() in ('admin','coach'));

-- Planos: staff da turma/atleta; atleta vê os publicados da turma dele ou dele.
create policy "treino_planos_staff" on public.treino_planos for all to authenticated
  using (public.treino_staff_pode(turma_id, aluno_id)) with check (public.treino_staff_pode(turma_id, aluno_id));
create policy "treino_planos_atleta" on public.treino_planos for select to authenticated
  using (status = 'publicado' and (aluno_id = public.meu_aluno_id() or turma_id = public.minha_turma_id()));

-- Sessões: idem.
create policy "treino_sessoes_staff" on public.treino_sessoes for all to authenticated
  using (public.treino_staff_pode(turma_id, aluno_id)) with check (public.treino_staff_pode(turma_id, aluno_id));
create policy "treino_sessoes_atleta" on public.treino_sessoes for select to authenticated
  using (status = 'publicado' and (aluno_id = public.meu_aluno_id() or turma_id = public.minha_turma_id()));

-- Passos: seguem a sessão (ou a biblioteca, para modelos).
create policy "treino_passos_staff" on public.treino_passos for all to authenticated
  using (
    (modelo_id is not null and public.get_my_role() in ('admin','coach'))
    or exists (select 1 from public.treino_sessoes s where s.id = sessao_id and public.treino_staff_pode(s.turma_id, s.aluno_id))
  )
  with check (
    (modelo_id is not null and public.get_my_role() in ('admin','coach'))
    or exists (select 1 from public.treino_sessoes s where s.id = sessao_id and public.treino_staff_pode(s.turma_id, s.aluno_id))
  );
create policy "treino_passos_atleta" on public.treino_passos for select to authenticated
  using (exists (
    select 1 from public.treino_sessoes s where s.id = sessao_id and s.status = 'publicado'
      and (s.aluno_id = public.meu_aluno_id() or s.turma_id = public.minha_turma_id())
  ));

-- Entregas e execuções: staff do atleta; o atleta só as próprias (escrita pelo servidor).
create policy "treino_entregas_staff" on public.treino_entregas for all to authenticated
  using (public.treino_staff_pode(null, aluno_id)) with check (public.treino_staff_pode(null, aluno_id));
create policy "treino_entregas_atleta" on public.treino_entregas for select to authenticated
  using (aluno_id = public.meu_aluno_id());
create policy "treino_execucoes_staff" on public.treino_execucoes for all to authenticated
  using (public.treino_staff_pode(null, aluno_id)) with check (public.treino_staff_pode(null, aluno_id));
create policy "treino_execucoes_atleta" on public.treino_execucoes for select to authenticated
  using (aluno_id = public.meu_aluno_id());

-- Limiares: staff do atleta; o atleta lê os próprios.
create policy "atleta_limiares_staff" on public.atleta_limiares for all to authenticated
  using (public.treino_staff_pode(null, aluno_id)) with check (public.treino_staff_pode(null, aluno_id));
create policy "atleta_limiares_atleta" on public.atleta_limiares for select to authenticated
  using (aluno_id = public.meu_aluno_id());
