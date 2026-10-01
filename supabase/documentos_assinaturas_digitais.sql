-- Assinaturas digitais (gov.br, ICP-Brasil...) encontradas no PDF enviado em
-- documentos_assinados, lidas no upload por lib/pdfAssinaturas.ts:
-- [{ "nome", "provedor", "emissor", "data" }]. [] = PDF sem assinatura digital;
-- null = documento enviado antes desta leitura existir.
-- Run this in the Supabase SQL editor.
alter table public.documentos_assinados add column if not exists assinaturas_digitais jsonb;
