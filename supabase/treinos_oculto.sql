-- Treino oculto (como o "Visível/Oculto" do Movelly): o treinador esconde um treino
-- sem apagar nem despublicar. Oculto = o atleta não vê no portal, não vai para o
-- Intervals/relógio, não casa com atividades e não conta no cumprimento.
-- Run this in the Supabase SQL editor — after treinos.sql.

alter table public.treino_sessoes add column if not exists oculto boolean not null default false;

drop policy if exists "treino_sessoes_atleta" on public.treino_sessoes;
create policy "treino_sessoes_atleta" on public.treino_sessoes for select to authenticated
  using (status = 'publicado' and not oculto and (aluno_id = public.meu_aluno_id() or turma_id = public.minha_turma_id()));

drop policy if exists "treino_passos_atleta" on public.treino_passos;
create policy "treino_passos_atleta" on public.treino_passos for select to authenticated
  using (exists (
    select 1 from public.treino_sessoes s where s.id = sessao_id and s.status = 'publicado' and not s.oculto
      and (s.aluno_id = public.meu_aluno_id() or s.turma_id = public.minha_turma_id())
  ));
