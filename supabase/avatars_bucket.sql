-- Run this in the Supabase SQL editor
-- Bucket público para foto de perfil dos atletas (criado antes na dashboard,
-- sem migration versionada — documentando aqui pra reprodutibilidade).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
