-- Diário de Aulas: um registro por treinador por dia de atividade
CREATE TABLE IF NOT EXISTS registros_aula (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    uuid NOT NULL REFERENCES profiles(id),
  data        date NOT NULL,
  modalidade  text NOT NULL,
  objetivo    text,
  observacoes text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(coach_id, data)
);

-- Descrição por turma dentro de um registro
CREATE TABLE IF NOT EXISTS registro_aula_turmas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_aula_id  uuid NOT NULL REFERENCES registros_aula(id) ON DELETE CASCADE,
  turma_id          uuid NOT NULL REFERENCES turmas(id),
  descricao         text,
  UNIQUE(registro_aula_id, turma_id)
);

-- RLS
ALTER TABLE registros_aula ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_aula_turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_registros_aula" ON registros_aula
  FOR ALL USING (
    coach_id = auth.uid() OR public.get_my_role() = 'admin'
  );

CREATE POLICY "staff_registro_aula_turmas" ON registro_aula_turmas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM registros_aula ra
      WHERE ra.id = registro_aula_id
      AND (ra.coach_id = auth.uid() OR public.get_my_role() = 'admin')
    )
  );
