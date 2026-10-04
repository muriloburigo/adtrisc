# Testar o módulo de treinos localmente

Tudo roda num Supabase **local** (Docker), restaurado do último backup. A produção não é tocada.

## Subir o ambiente

```bash
git checkout feat/modulo-treinos
bash scripts/dev/restaurar-local.sh     # apaga e recria o banco LOCAL; aplica migrations-pendentes.txt
node scripts/dev/intervals-mock.mjs     # (outro terminal) Intervals.icu falso na porta 4010
npm run dev                              # http://localhost:3000
```

Usuários: os mesmos da produção, senha `adtrisc-dev` (o script lista). O `.env.intervals.dev`
(gerado na primeira vez, fora do Git) liga o mock; o restaurar copia ele para o `.env.development.local`.

## Roteiro

1. **Turma**: Turmas → editar → "Esta turma usa o módulo de treinos" (Pré equipe e equipes já vêm ligadas).
2. **Treinos** (menu): escolha a turma → "+" num dia → monte os blocos → Visão geral (paces por atleta,
   texto do Intervals) → Salvar e publicar. Aba Atletas → "Ajustar para este atleta".
3. **Arrastar**: mova um treino de dia; abra a Biblioteca e arraste um modelo para um dia; "Duplicar semana".
4. **Planos**: "planos" → Novo plano → mude objetivo/dias e veja a prévia → criar → publicar.
5. **Portal**: página de um atleta → "Portal do atleta" → Gerar convite → abra o link numa janela anônima →
   crie usuário e senha (escolha uma senha de teste qualquer). No portal: abrir treino, marcar feito com comentário.
6. **Intervals (mock)**: no portal → Minha conta → Conectar Intervals.icu. Conferir os eventos enviados:
   `curl localhost:4010/_mock/estado`. Simular uma atividade feita e o webhook:
   ```bash
   curl -X POST localhost:4010/_mock/atividade -d '{"tipo":"Run","data":"AAAA-MM-DD","distancia_m":5000,"duracao_s":1800}'
   curl -X POST localhost:4010/_mock/webhook -d '{"tipo":"ACTIVITY_UPLOADED"}'
   ```
   (a data precisa ter um treino publicado de corrida, dos últimos 3 dias, para casar; senão vira "extra").
7. **Comparativo / FIT**: no calendário do atleta, abra o treino → aba Comparativo; "Enviar atividade (.fit)";
   "Baixar treino (.fit)". Biblioteca → "Importar FIT".
8. **Acompanhamento**: página do atleta (card Treinos), Turma → Desempenho (coluna Treinos 30d), Relatórios
   (grupo Treinos).

## Testar com o Intervals de verdade

Troque no `.env.development.local` as linhas do mock por `INTERVALS_CLIENT_ID` / `INTERVALS_CLIENT_SECRET`
reais (Manage App no intervals.icu) e apague `INTERVALS_BASE_URL`. O redirect `http://localhost:3000/api/intervals/callback`
já é aceito pelo Intervals. O webhook não chega no localhost: use "reenviar" e o cron
(`curl localhost:3000/api/cron/intervals -H "Authorization: Bearer $CRON_SECRET"`).
