-- Soft delete: adiciona deleted_at às tabelas de presencas e avaliacoes_fisicas
-- Registros existentes ficam com NULL (= não deletados), comportamento idêntico ao atual.

ALTER TABLE presencas          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE avaliacoes_fisicas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
