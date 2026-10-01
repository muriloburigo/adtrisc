-- Assinatura desenhada do treinador (PNG em data URL), cadastrada em
-- "Minha conta" ou por admin em Treinadores → Editar, e aplicada nos rodapés
-- do relatório da turma, da exportação de presenças e do diário.
-- Run this in the Supabase SQL editor.
alter table public.profiles add column if not exists assinatura text
  check (assinatura is null or (assinatura like 'data:image/png;base64,%' and char_length(assinatura) <= 400000));
alter table public.profiles add column if not exists assinatura_atualizada_em timestamptz;
