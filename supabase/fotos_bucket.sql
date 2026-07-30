-- Bucket público para fotos de turma (galeria antiga e "foto do dia" do
-- Diário de Aulas) — faltava criar; sem ele, todo upload de foto falhava.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;
