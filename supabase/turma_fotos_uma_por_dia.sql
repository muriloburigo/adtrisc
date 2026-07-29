-- Uma foto por turma por dia (o Diário de Aulas passa a ser o único lugar
-- que gerencia fotos; upload novo no mesmo dia/turma substitui o anterior).
alter table public.turma_fotos
  add constraint turma_fotos_turma_data_unique unique (turma_id, data);
