-- Arquivos FIT das atividades enviadas pelo atleta/treinador (upload no treino).
-- Run this in the Supabase SQL editor — after treinos.sql.
-- Bucket privado: leitura e escrita só pelo servidor (service role); o app
-- entrega o arquivo por URL assinada.
insert into storage.buckets (id, name, public, file_size_limit)
values ('treinos-fit', 'treinos-fit', false, 10485760)
on conflict (id) do nothing;
