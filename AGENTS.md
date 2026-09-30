<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ADTRISC — Sistema de Gestão

Management system for **Associação Desportiva Triatlética de Santa Catarina (ADTRISC)**, specifically its youth triathlon academy (*Escolinha de Triathlon São José*). Handles class management, athlete enrollment, attendance, fitness assessments, and digital enrollment forms.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.4 |
| Runtime | React | 19.2.4 |
| Language | TypeScript (strict) | 5.9.3 |
| Styling | Tailwind CSS v4 | 4.2.4 |
| Bundler (dev) | Turbopack | built-in |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth + `@supabase/ssr` | 0.10.2 |
| Icons | lucide-react | 1.14.0 |
| Image processing | sharp | 0.34.5 |
| Class utilities | clsx + tailwind-merge | — |
| Font | Geist Sans (Google Fonts) | — |
| Deployment | Vercel | — |

Tailwind v4 uses CSS-first configuration (`@theme` in `app/globals.css`). There is no `tailwind.config.js`.

---

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://gjsbxpdkfmqtfwkdcbxh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>    # server-side admin operations only
SUPABASE_DB_PASSWORD=<db password>
```

Optional (used by `fichas/actions.ts` to build share links):

```
NEXT_PUBLIC_APP_URL=https://adtrisc.vercel.app
```

---

## Project Structure

```
adtrisc/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page (client component)
│   │   └── politica/page.tsx       # Privacy policy (LGPD)
│   ├── (dashboard)/                # Protected layout — requires auth
│   │   ├── layout.tsx              # Sidebar + MobileHeader wrapper
│   │   ├── dashboard/              # Overview with stats, occupancy, attendance
│   │   ├── alunos/                 # Athlete CRUD + detail view
│   │   ├── turmas/                 # Class CRUD + photo gallery + reports
│   │   ├── presencas/              # Attendance tracking + export
│   │   ├── avaliacoes/             # Fitness assessment grids by class/date
│   │   ├── relatorios/             # Athlete report: combined filters over cadastro + ficha + avaliações (no export)
│   │   ├── provas/                 # External competitions: categories + athlete results
│   │   ├── imprensa/               # Press clippings: link + auto preview (title/description/image)
│   │   ├── candidatos/             # Enrollment applicants queue
│   │   ├── coaches/                # Coach user management (admin only)
│   │   ├── configuracoes/          # User management (admin only)
│   │   ├── auditoria/              # Audit log viewer (admin only)
│   │   ├── diario/                 # Class diary (lesson log + monthly summary + signed reports)
│   │   ├── financeiro/             # Budget per project/category + coach-submitted expense notes
│   │   └── fichas/                 # Digital enrollment form generation
│   ├── ficha/[token]/              # Public — enrollment form filled by parents
│   ├── inscricao/                  # Public — online pre-enrollment form
│   ├── regras-sorteio/             # Public — lottery rules page
│   ├── actions/upload-avatar.ts    # Server action: upload athlete photo
│   ├── globals.css                 # Tailwind v4 @theme definitions
│   ├── layout.tsx                  # Root layout (Geist font, pt-BR lang)
│   └── page.tsx                    # Redirects / → /dashboard
├── components/
│   ├── alunos/AlunoForm.tsx        # Create/edit athlete form
│   ├── turmas/TurmaForm.tsx        # Create/edit class form
│   ├── provas/                     # Categoria/resultado forms + cards for the Provas detail page
│   ├── imprensa/                   # MateriaForm.tsx (add link) + MateriaCard.tsx (preview + delete)
│   ├── documentos/                 # DocumentosAssinadosSection.tsx — upload/list/delete signed PDFs
│   ├── enrollment/                 # CamposComuns.tsx — fields shared by /inscricao and /ficha/[token]
│   ├── layout/
│   │   ├── Sidebar.tsx             # Desktop nav (role-filtered)
│   │   └── MobileHeader.tsx        # Mobile nav header
│   └── ui/                         # Reusable primitives: Button, Card, Badge,
│                                   #   Input, Select, Avatar, FilterBar, etc.
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (cookie-based)
│   │   └── admin.ts                # Service-role client (bypasses RLS)
│   ├── assert.ts                   # requireStaff() / requireAdmin() guards
│   ├── audit.ts                    # logAudit() + getSessionUser()
│   ├── documentosAssinados.ts      # Signed-PDF upload/delete (bucket `documentos`)
│   ├── errors.ts                   # friendlyError() — translates Supabase/RLS errors for the UI
│   ├── faltasAlerta.ts             # Computes attendance-alert thresholds per athlete
│   ├── linkPreview.ts              # Open Graph scraper + slug-based title fallback (Imprensa).
│                                   #   Resolves DNS and blocks private/loopback/link-local IPs
│                                   #   (incl. on every redirect hop) — SSRF guard, don't remove.
│   ├── password.ts                 # Password validation rules
│   ├── provas.ts                   # Etapa/status labels + helpers for the Provas feature
│   ├── termos.ts                   # Enrollment terms & conditions text (shared by inscricao/ficha)
│   ├── turmas.ts                   # getTurmaIdsForCoach() — turma scoping for coach-only actions
│   └── utils.ts                    # cn(), formatDate(), formatTelefone(), etc.
├── types/
│   └── database.ts                 # All TypeScript types: enums + row types
├── supabase/                       # SQL migrations — run manually in the Supabase SQL editor
│   ├── schema.sql                  # v1 schema (legacy — do not re-run)
│   ├── schema_v2.sql               # v2 schema with turmas, alunos, responsaveis
│   ├── fichas_inscricao.sql        # fichas_inscricao table migration
│   ├── provas.sql                  # provas / prova_categorias / resultados_prova tables
│   ├── materias_imprensa.sql       # materias_imprensa table (Imprensa area)
│   ├── turma_fotos_table.sql       # turma_fotos table (was hand-created in the dashboard until this)
│   ├── soft_delete.sql             # Adds deleted_at to presencas & avaliacoes_fisicas
│   └── ...                         # one file per feature added since — see Backup & Restore
│                                   #   for the full run order on a from-scratch restore
├── scripts/backup/                 # Local backup/restore tooling — see "Backup & Restore" below
│   ├── backup.sh                   # Full backup: pg_dump + auth_users.csv + storage buckets
│   ├── backup-storage.mjs          # Downloads every Storage bucket (listed from the project), called by backup.sh
│   ├── com.adtrisc.backup.plist    # LaunchAgent (versioned copy of the one installed in ~/Library/LaunchAgents)
│   └── restore-storage.mjs         # Re-uploads a backup's storage/ dir back into Supabase
├── proxy.ts                        # Auth gate + public route exceptions (Next.js 16 "middleware")
├── next.config.ts                  # headers(): X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy
│                                   #   (no CSP — Imprensa loads preview images from arbitrary news sites)
├── tsconfig.json                   # Path alias: @/* → ./*
└── vercel.json                     # Build/dev/install commands
```

---

## Authentication

Supabase Auth with cookie sessions via `@supabase/ssr`.

**Proxy** (`proxy.ts` — Next.js 16's rename of `middleware.ts`) runs on every request except `_next/static`, `_next/image`, and image files. It:
1. Creates a server Supabase client from cookies.
2. Calls `supabase.auth.getUser()`.
3. Redirects unauthenticated users to `/login` (except public routes).
4. Redirects authenticated users away from auth routes to `/dashboard`.

**Public routes** (no auth required):
- `/login`, `/signup`
- `/politica`
- `/inscricao`
- `/regras-sorteio`
- `/ficha/*`

**Server-side auth helpers** in `lib/assert.ts`:

```typescript
requireStaff()  // throws if not admin or coach
requireAdmin()  // throws if not admin
```

These are called at the top of Server Actions to enforce authorization. `lib/audit.ts` is `server-only` (not `'use server'`): as a server action, `logAudit` could be called by any client to write fake audit rows with the service role. The dashboard layout also does a redundant `redirect('/login')` check.

**Passwords**
- `/conta` ("Minha conta", in the sidebar for every role): change your own password — the current password is checked first with a throwaway, cookie-less client, then `auth.updateUser`.
- New passwords follow `validatePassword()`/`validarNovaSenha()` in `lib/password.ts` (same 5 requirements as `PasswordInput`), checked on the server in every flow. All of them log `action: 'senha'` in `audit_logs`.
- **No self-service recovery.** A "Esqueci minha senha" flow existed briefly (30/09/2026) and was removed on request, because without custom SMTP Supabase only e-mails members of the Supabase org. Someone who forgot their password asks an admin, who sets a new one in **Configurações → Editar usuário → Redefinir senha** (any account except their own; `redefinirSenhaUsuario`) or **Treinadores → Editar → Redefinir senha** (coaches only). Both use `components/usuarios/ResetPasswordForm.tsx`; the person then changes it in `/conta`.
- Supabase Auth config left from that attempt (harmless): Site URL `https://adtrisc.vercel.app`, redirect allow list `…/auth/callback`, recovery template in Portuguese. **Public sign-up is disabled** (`disable_signup = true`); accounts are only created by an admin via `auth.admin.createUser`.

**Roles** (stored in `profiles.role`):

| Role | Access |
|------|--------|
| `admin` | Full access to all dashboard sections |
| `coach` | Dashboard, turmas, alunos, presencas, avaliacoes, candidatos |
| `aluno` | Dashboard only (limited, mostly unused) |
| `pai` | Dashboard only; can see their child's data via RLS |

Sidebar nav items are filtered by role in `components/layout/Sidebar.tsx`.

---

## Database Schema

All SQL files live in `supabase/`. Run them in order in the Supabase SQL editor when setting up a new project. Row Level Security (RLS) is enabled on all tables.

### Enums (TypeScript, `types/database.ts`)

```typescript
DiaSemana       = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
TurmaModalidade = 'triathlon' | 'natacao' | 'ciclismo' | 'corrida' | 'duathlon'
TurmaStatus     = 'ativa' | 'inativa' | 'suspensa'
AlunoStatus     = 'ativo' | 'inativo' | 'desligado'
SexoEnum        = 'M' | 'F'
Parentesco      = 'mae' | 'pai' | 'outro'
UserRole        = 'admin' | 'coach' | 'aluno' | 'pai'
```

### Tables

**`profiles`** — mirrors `auth.users`; auto-created by trigger on user signup
- `id` (uuid, FK → auth.users), `email`, `full_name`, `role` (UserRole), `avatar_url`, `cref` (coach's professional registration number, nullable)

**`turmas`** — training classes
- `id`, `nome`, `modalidade` (TurmaModalidade), `dias_semana` (DiaSemana[]), `horario_inicio`, `horario_fim`, `coach_id` (FK → profiles), `capacidade`, `ano`, `semestre` (1|2), `idade_min`, `idade_max`, `captacao_aberta` (bool), `status` (TurmaStatus), `observacoes`

**`alunos`** — athletes/students
- `id`, `turma_id` (FK → turmas), `profile_id` (FK → profiles, nullable), `nome`, `telefone`, `sexo` (SexoEnum), `data_nascimento`, address fields (`rua`, `numero`, `bairro`, `cep`, `cidade`), `foto_url`, `status` (AlunoStatus), `observacoes`

**`responsaveis`** — parents/guardians
- `id`, `profile_id` (FK → profiles, nullable), `nome`, `cpf`, `rg`, `email`, `telefone`, `parentesco` (Parentesco)

**`aluno_responsavel`** — junction table linking athletes to guardians
- `aluno_id`, `responsavel_id`, `principal` (bool — mae is set as principal by default)

**`turma_fotos`** — class photo gallery (table only ever existed hand-created in the dashboard until `supabase/turma_fotos_table.sql` documented it)
- `id`, `turma_id`, `url`, `storage_path`, `titulo`, `data`, `uploaded_by` (FK → profiles, nullable), `file_hash`, `created_at`
- Unique constraint on `(turma_id, data)` — one photo per class per day

**`avaliacoes_fisicas`** — fitness assessments (soft-deleted via `deleted_at`)
- `id`, `aluno_id`, `avaliador_id` (FK → profiles, nullable), `data`, `massa_corporal`, `estatura`, `perimetro_cintura`, `envergadura`, `estatura_sentado`, `altura_cm`, `altura_ao_quadrado`, `imc` (auto-computed), `rce`, `sentar_alcancar`, `resistencia_6min`, `forca_abdominal`, `arremesso_medicineball`, `agilidade`, `salto_horizontal`, `corrida_20m`, `natacao_12min`, `resistencia_5min_dabonneville` (m), `maturity_offset` (anos), `maturity_classificacao` (text, ex. "Janela do PHV"), `ciclismo_2km_tempo` (s, entered as `MM:SS.cc`), `ciclismo_2km_velocidade` (km/h, auto-computed from the time), `atividade_url` (Garmin/Polar link of the test), `natacao_50m`/`natacao_100m` (s, entered as `MM:SS.cc`), `altura_banco` (cm of the bench used for seated height; trunk = `estatura_sentado − altura_banco`, null = already trunk), `observacoes`
- `maturity_offset`/`maturity_classificacao` are **legacy manual columns** — maturation is computed on display by `lib/maturacao.ts` (Mirwald 2002, same as the Science for Sport calculator the coaches use) from the athlete's sexo/data_nascimento + massa/estatura/estatura_sentado/altura_banco, so it never goes stale when the cadastro changes.
- One row per athlete+date. "Field tests" (Dabonneville, ciclismo 2 km, natação 50/100 m) can be registered alone from the athlete page (`registrarTeste`); such rows don't count as a class assessment session in `/avaliacoes` history (only rows with PROESP battery fields do).
- All exact field names — the previous version of this doc (`impulsao_vertical`, `velocidade_20m`, `flexibilidade`) didn't match the real columns or `types/database.ts`'s `AvaliacaoFisicaRow`; verified against production with `information_schema.columns`.

**`config_avaliacao`** — single row (`id = 1`) of assessment settings (`testes_campo_proesp.sql`)
- `zona_limites` (numeric[5], % of the test's average speed at the top of Z1..Z5, default `{65,75,85,95,120}`), `altura_banco_padrao` (cm, default 40), `natacao_100m_corte_s` (max 100 m time to move up from pré equipe to equipe; null = no "apto" badge). Staff reads, admin writes (card in `/configuracoes`). Read it with `getConfigAvaliacao()` (`lib/config-avaliacao.ts`), which falls back to defaults.
- Training zones are **not stored**: `lib/zonas.ts` derives them from the most recent Dabonneville 5' (running: pace, 400 m and 200 m times) and ciclismo 2 km (km/h, 400 m lap) — shown on `/alunos/[id]` and printable per class at `/avaliacoes/[turmaId]/zonas`. (`zonas_treino` existed briefly and was dropped.)
- PROESP-Br norms (health cut-offs + performance percentiles by sex and age 6–17, Manual 2021) live in `lib/proesp.ts`; age is taken at the assessment date (`idadeNaData`).

**`historico_atleta`** — athlete lifecycle events (auto-written by alunos actions)
- `id`, `aluno_id`, `tipo` (`matricula` | `mudanca_turma` | `desligamento` | `reativacao`), `data`, `turma_id`, `turma_nome`, `turma_anterior_id`, `turma_anterior_nome`

**`presencas`** — attendance records (soft-deleted via `deleted_at`)
- `id`, `aluno_id`, `turma_id`, `data`, `presente` (bool), `justificada` (bool), `observacao`, `registrado_por` (FK → profiles, nullable)
- Unique constraint on `(turma_id, aluno_id, data)` — upserted on save

**Shared enrollment fields** (`unificar_fichas_candidatos.sql` + `fichas_campos_neutros.sql` unified `candidatos` and `fichas_inscricao` around the same field set — both tables carry nearly all of these):
- Participant: `nome`/`p_nome`, `data_nascimento`/`p_data_nascimento`, `sexo`/`p_sexo`, `cpf`/`p_cpf`, address (`rua`/`p_rua`, `numero`/`p_numero`, `bairro`/`p_bairro`, `cep`/`p_cep`, `cidade`/`p_cidade`, or `endereco_completo` on `candidatos`), `telefone`/`p_telefone`
- School: `escola_nome_endereco`, `serie_escolar`
- Health: `condicao_medica` + `condicao_medica_descricao`, `tratamento_medico` + `tratamento_medico_descricao`, `alergia` + `alergia_descricao`, `autorizacao_medica`
- Other: `praticou_modalidade`, `interesse_eventos`, `como_soube`, `tem_bicicleta`, `tamanho_camiseta`
- Guardians: `mae_nome`/`mae_cpf`/`mae_rg`/`mae_email`/`mae_telefone`, `pai_nome`/`pai_cpf`/`pai_rg`/`pai_email`/`pai_telefone` (or `responsavel_nome`/`responsavel_telefone`/`responsavel_email` on `candidatos`), `responsavel_assina`, `aceite_termos`, `assinatura_data` (base64 PNG)

**`candidatos`** — pre-enrollment applicants (from public `/inscricao` form)
- `id`, `turma_id`, `status`, `email_responsavel`, `observacoes_internas` (staff-only), `created_at`, `updated_at`, plus the shared enrollment fields above

**`fichas_inscricao`** — digital enrollment forms sent to parents
- `id`, `token` (uuid, unique — used in public URL `/ficha/{token}`), `aluno_id`, `status` (pendente/preenchida/expirada), `gerado_por` (FK → profiles), `gerado_em`, `preenchido_em`, `expires_at` (default 30 days from creation), `created_at`, `updated_at`, plus the shared enrollment fields above (participant fields prefixed `p_`)

**`provas`** — external competitions (e.g. a city duathlon) the athletes take part in
- `id`, `nome`, `local`, `data`, `observacoes`, `criado_por` (FK → profiles)

**`prova_categorias`** — age-based categories within a prova, each with its own leg distances
- `id`, `prova_id` (FK → provas), `nome`, `idade_min`, `idade_max`, `etapas` (jsonb array of `{modalidade, distancia_metros}`, in race order), `ordem`

**`resultados_prova`** — one result row per athlete per prova
- `id`, `prova_id`, `categoria_id` (FK → prova_categorias), `aluno_id` (FK → alunos), `tempo_total_segundos`, `colocacao_geral`, `colocacao_categoria`
- Unique constraint on `(prova_id, aluno_id)` — upserted on save

**`materias_imprensa`** — press clippings (links to articles mentioning ADTRISC)
- `id`, `url`, `titulo`, `descricao`, `imagem_url`, `site`, `criado_por` (FK → profiles), `created_at`

**`documentos_assinados`** — signed PDFs sent back after digital signature (relatório de turma, presença exportada, diário de aula)
- `id`, `turma_id` (nullable — null for diário docs, which are per-coach instead), `coach_id` (FK → profiles, nullable), `tipo` (`relatorio_turma` | `presenca_exportar` | `diario_aula`), `periodo`, `nome_arquivo`, `storage_path`, `enviado_por` (FK → profiles), `enviado_em`

**`turma_coaches`** — junction table for turmas with more than one coach (assistant coaches)
- `turma_id`, `coach_id`, `created_at`. Read by `coach_has_turma()` — see RLS Summary.

**`registros_aula`** — one lesson-diary entry per coach per day (Diário de Aulas)
- `id`, `coach_id` (FK → profiles), `data`, `modalidade`, `objetivo`, `observacoes`, `descricao`, `created_at`, `updated_at`
- Unique per `(coach_id, data)` — upserted by `criarMultiplosRegistros()`'s batch-fill flow

**`registro_aula_turmas`** — which turmas a `registros_aula` entry covers, with a per-turma note
- `id`, `registro_aula_id` (FK → registros_aula), `turma_id` (FK → turmas), `descricao`

**`diario_resumos`** — monthly free-text summary per coach, feeding the signed diário report
- `coach_id` (FK → profiles), `ano`, `mes`, `cidade`, `processo`, `resumo`, `updated_at`
- Unique per `(coach_id, ano, mes)` — upserted

**`audit_logs`** — all admin/coach write actions
- `id`, `user_id`, `user_name`, `action` (criar/editar/excluir/senha/status/sorteio), `resource` (turma/atleta/treinador/candidato/usuario/presenca/prova/materia/documento/ficha/diario/foto/financeiro/config), `resource_id`, `resource_label`, `before_data` (JSONB), `after_data` (JSONB), `metadata` (JSONB), `created_at`. No check constraint on `action`/`resource` (plain `text`) — confirmed by inspecting the live table, so new values never need a migration, only extending the TS unions in `lib/audit.ts`.

**`categorias_financeiras`** — global, reusable expense categories (Treinadores, Camisetas, Viagens...)
- `id`, `nome`, `ativo` (soft-disable — categories are never hard-deleted since budgets/notes reference them), `created_at`

**`projetos_financeiros`** — a funding source (edital, patrocínio) with its own budget, scoped to one competência year
- `id`, `nome`, `ano` (the competência — a project spanning multiple years gets one row per year, same convention as `turmas.ano`), `descricao`, `objetivo`, `metas`, `ativo`, `criado_por` (FK → profiles), `created_at`

**`projeto_arquivos`** — general attachments on a projeto (plano de trabalho, convênio assinado, edital) — separate from a lançamento's own nota attachment
- `id`, `projeto_id` (FK → projetos_financeiros, cascade), `nome_arquivo`, `storage_path`, `enviado_por` (FK → profiles), `created_at`

**`orcamentos_financeiros`** — the budgeted amount for one projeto+categoria pair
- `id`, `projeto_id` (FK, cascade), `categoria_id` (FK, restrict), `valor_orcado`, `updated_at`
- Unique on `(projeto_id, categoria_id)` — upserted from the inline editor on the projeto detail page

**`lancamentos_financeiros`** — an expense note (nota fiscal) a coach logs against a projeto+categoria's budget
- `id`, `projeto_id` (FK, restrict — a projeto with notes can't be deleted), `categoria_id` (FK, restrict), `coach_id` (FK → profiles — who it's logged under; admin can log on behalf of any coach), `valor`, `descricao`, `numero_nota`, `data`, `nome_arquivo`, `storage_path`, `created_at`, `updated_at`
- No approval flow — a saved lançamento counts against the budget's "consumido" immediately; admin edits/deletes to correct mistakes.

### RLS Summary

- `admin` and `coach` can read most tables.
- Only `admin` can write alunos, responsaveis, turmas (delete), fichas, and user records — **except** `coach` may also remove (desligar) an athlete from their own turma, via the `remover_aluno_turma()` SECURITY DEFINER RPC (`supabase/alunos_coach_remove.sql`), called from `removerAlunoTurma()` in `alunos/actions.ts`. A direct RLS policy doesn't work here: nulling `turma_id` makes the row fail the coach's own SELECT policy (`coach_has_turma(turma_id)`), and Postgres rejects an UPDATE whose result the caller can no longer see — even under a permissive UPDATE policy. The RPC validates admin/coach-of-turma manually and writes with elevated privilege instead.
- `pai` can only read their own children and related records (via `aluno_responsavel` join).
- `provas`/`prova_categorias` are shared event data (not tied to one turma) — any staff (admin or coach) can read/write them. `resultados_prova` is scoped like `avaliacoes_fisicas`: a coach can only read/write results for athletes in a turma they coach (`coach_has_turma()`), admin unrestricted.
- `materias_imprensa` follows the same shared-staff pattern as `provas`.
- The 4 `*_financeiros`/`projeto_arquivos` tables: **select** is open to any staff (admin+coach) on all of them — a coach needs to see every other coach's lançamentos too, otherwise the budget "consumido" total on `/financeiro` would only reflect their own notes. **Write** on `categorias_financeiras`/`projetos_financeiros`/`orcamentos_financeiros`/`projeto_arquivos` is admin-only. **Write** on `lancamentos_financeiros` is admin OR the row's own `coach_id = auth.uid()` — a coach can only create/edit/delete their own notes.
- Public routes use `createAdminClient()` (service role) to bypass RLS for inscricao and ficha submissions.

### Helper DB Function

```sql
public.get_my_role()  -- returns role of the current authenticated user (used in RLS policies)
```

---

## Key Features

### Public Enrollment (`/inscricao`)
Parents fill a form to pre-enroll their child. Requires selecting a turma with `captacao_aberta = true`. Creates a `candidatos` record with status `pendente`. Uses `createAdminClient()` to bypass RLS.

### Candidate Management (`/candidatos`)
Staff reviews applicants and changes status (approve, reject, lottery draw, waitlist, enroll). Status changes are audit-logged.

### Class Management (`/turmas`)
CRUD for turmas. Each class has a photo gallery (Supabase Storage bucket `fotos`). Staff can generate batch enrollment form links for all active athletes in a class.

### Athlete Management (`/alunos`)
Full CRUD for athletes.

- **No duplicate athletes.** `createAluno` checks every athlete (service role, so a coach also sees other turmas and desligados) with `mesmaPessoa()` from `lib/nomes.ts`. It ignores accents, case, extra spaces, particles (de/da/do...) and accepts abbreviations ("M." = "Maria") and a missing middle name. On a match, the form lists the existing records and creates a new one only after an explicit "É outra pessoa" confirmation. Siblings (same surname, different first name) are not flagged. On 30/09/2026, "Maitê"/"Maite de Moraes Matzenbacher" existed twice, split only by an accent, and were merged.
- **Source of truth.** The ficha filled and signed by the parents always wins over any other source (Google Form, spreadsheets, manual entry), even when a value looks wrong. Raise the doubt with the family, never swap in another source's value.

Each athlete has:
- Parents/guardians (responsaveis) managed inline on the same form.
- Timeline showing enrollment history, class changes, deactivations, and fitness assessments.
- Avatar upload (Supabase Storage bucket `avatars`, max 3 MB, JPEG/PNG/WebP only — exact allowlist, not a `startsWith('image/')` prefix check, since that would also accept `image/svg+xml` and SVGs can carry `<script>`).

### Attendance (`/presencas`)
Staff selects a class and date, then marks each athlete present/absent/excused. Records are upserted by `(turma_id, aluno_id, data)`. Supports export/print view.

### Fitness Assessments (`/avaliacoes`)
Grid view per class and date. See the `avaliacoes_fisicas` table above for the exact field list (body mass, height, waist/seated-height/wingspan measurements, IMC auto-computed, sit-and-reach flexibility, 6-min run, abdominal strength, medicine ball throw, agility, standing long jump, 20m run, 12-min swim). Soft-deleted via `deleted_at`. Individual assessments also accessible from athlete detail page.

### Reports (`/relatorios`)
Admin and coach. One screen that answers "which athletes match these criteria". Filters over every athlete field combine with AND; a list filter's options combine with OR. Covered: cadastro, responsáveis, ficha, measures, PROESP tests and classification, field tests, maturação. Results update on screen as filters change. **No export by design.**
- `lib/relatorio.ts` holds the field list (`CAMPOS`), row building (`montarLinhas`, server) and filtering (`aplicarFiltros`, client). It reuses `classificarProesp`/`calcularMaturacao`, so values match the athlete page.
- The result is always one row per athlete. The "critérios de avaliação usam" selector picks which evaluation counts:
  - the **most recent result of each test** (default);
  - **any evaluation in a date range**, where one evaluation must satisfy all the evaluation criteria together, and the columns show the most recent matching one.
- Scope: athletes come through the RLS client, so a coach sees only their turmas. Responsáveis/fichas use the service role, restricted to those athletes. CPF/RG fields (`admin: true`) are stripped on the server for non-admins.
- **Evolução** (only in "most recent" mode) compares the two most recent results **of each test**, which may come from different dates. `tend_<test>` is Melhorou/Piorou/Manteve. `melhora_<test>` is positive whenever the athlete got better, so time tests are sign-flipped (`MENOR_MELHOR`). Body measures get only `var_<measure>`, a raw difference, since "better" doesn't apply to them. `intervalo_avaliacoes` is the number of days between the two latest evaluations.
- State (filters, columns, sort) lives in `?r=` in the URL, so a report can be bookmarked or shared. The "Prontos" chips are presets of that same state.

### Competitions & Results (`/provas`)
Staff registers external competitions (nome, local, data, observações) with one or more age-based categories, each defining an ordered list of leg distances (`etapas`: natação/ciclismo/corrida + distância em metros). Results are logged per athlete against a category: total time (stored in seconds, entered/displayed as `MM:SS` via `mmssToSeconds()`/`secondsToMmss()`), plus overall and category placement. One result per athlete per prova (upserted). Deleting a categoria cascades its results — confirmed with a warning showing the affected count.

### Press Clippings (`/imprensa`)
Staff pastes a link to an article/news piece mentioning ADTRISC. The server fetches the page's Open Graph tags (title, description, image) and stores a reduced preview — done once at add time, not re-fetched on every view. Sites that block scraping (e.g. Cloudflare bot protection) still get saved, just without a preview: the title falls back to a human-readable version of the URL slug (`lib/linkPreview.ts`'s `titleFromSlug()`). Add/remove only — no editing.

### Digital Enrollment Forms (`/ficha/[token]`)
Staff generates a tokenized link per athlete (or in bulk per class). Parents open the public URL, review pre-filled data, add guardian details, and sign digitally (base64 PNG signature). The form is fully unauthenticated — uses service role client. Admin can invalidate (expire) a form from the athlete detail page.

**Ficha → cadastro.** On submit, `submitFicha` calls `aplicarFichaNoCadastro()` (`lib/fichaCadastro.ts`): the athlete's nome, telefone, sexo, data_nascimento and address go to `alunos`, and mãe/pai go to `responsaveis` + `aluno_responsavel` (created or updated). What the parents sent wins over the cadastro, since the ficha is generated pre-filled from it; an empty field never erases anything. Everything else in the ficha (CPF do atleta, escola, saúde, equipamentos) has no column in `alunos` and is shown on `/alunos/[id]` by `FichaDadosCard`, read from the most recent filled ficha. Staff can re-apply a filled ficha with the ↻ button in the ficha list (`aplicarFichaCadastro`). Until 30/09/2026 none of this existed: ficha data never reached the cadastro, and the 63 athletes imported from the 2026 Google Form on 08/05 had come in without a birth date. Both were backfilled once on 30/09/2026.

### Audit Log (`/auditoria`)
Admin-only. Shows all write actions with actor, resource, and before/after diffs. Sensitive fields (`id`, `created_at`, `updated_at`, `password`, `avatar_url`, `captacao_aberta`) are stripped before logging. CPF/RG of parents/guardians are deliberately never included in audit payloads, even when the action touches a `fichas_inscricao`/`responsaveis` row — only non-sensitive fields (status, ids, counts) are logged for those.

### Class Diary (`/diario`)
Coach logs lessons per day (modalidade, objetivo, observações, which turmas), can batch-fill a whole month, and writes a monthly summary (`diario_resumos`) used in signed reports. A "foto do dia" can be attached per turma/date (bucket `fotos`).

### Financeiro (`/financeiro`)
Budget tracking per project (edital/patrocínio) and category, plus coach-submitted expense notes (notas fiscais). Four tabs (`FinanceiroTabs.tsx`): **Orçamento** (`/financeiro`, everyone) — pick a competência year, see every projeto that year as a card with orçado/consumido/saldo per categoria and a progress bar (green <70%, yellow 70–100%, red past 100%, computed by `lib/financeiro.ts`'s `percentConsumido()`/`progressoBarColor()`); **Notas Fiscais** (`/financeiro/notas`, everyone) — filterable list, "+ Nova nota" lets a coach log an expense (valor, categoria, data, optional anexo — PDF/JPG/PNG/WebP up to 10MB in the private `notas-fiscais` bucket) against their own name, admin can log on behalf of any coach and edit/delete anyone's; **Projetos** (`/financeiro/projetos`, admin-only) — CRUD for projects (nome, ano, descrição, objetivo, metas), per-projeto page has an inline-editable orçamento table per categoria (`OrcamentoTable.tsx` — each row is its own component with its own `useTransition`, so saving one category's value never disables another mid-edit) and a general attachments section (`ProjetoArquivosSection.tsx`, private `financeiro-arquivos` bucket, for plano de trabalho/convênio/edital docs); **Categorias** (`/financeiro/categorias`, admin-only) — manage the shared category list, rename inline, soft-disable (never hard-deleted, since budgets/notes reference them). No approval flow — a lançamento counts against the budget the moment it's saved. See the `### RLS Summary` note above for the read-open/write-scoped policy shape.

### User / Coach Management
- `/coaches` — Admin creates/edits/deletes coach accounts using `auth.admin` APIs. Every action in `coaches/actions.ts` starts with `requireAdmin()` and only acts on profiles with `role = 'coach'` — until 30/09/2026 they had **no** check (the page was admin-only, the actions weren't), so any logged-in user could reset any password, including an admin's. Rule: an action that uses `createAdminClient()` must authorize **inside the action**; guarding the page is not enough.
- `/configuracoes` — Admin views all auth users, edits name/role, resets another user's password, deletes users.
- Passwords must meet 5 requirements: 8+ chars, uppercase, lowercase, digit, special character (validated in `lib/password.ts`).

---

## Supabase Clients

| Client | File | Usage |
|--------|------|-------|
| Browser | `lib/supabase/client.ts` | Client components (login, sidebar logout) |
| Server (cookie-based) | `lib/supabase/server.ts` | Server components + Server Actions (RLS enforced) |
| Admin (service role) | `lib/supabase/admin.ts` | Bypasses RLS — public form submissions, `auth.admin` calls, storage uploads |

Only use the admin client in Server Actions or server-side code, never in client components.

---

## Supabase Storage Buckets

| Bucket | Public | Used for |
|--------|--------|----------|
| `avatars` | Yes | Athlete profile photos (path: `alunos/{uuid}.{ext}`) |
| `fotos` | Yes | Class photo gallery + diário "foto do dia" (path: `turmas/{turmaId}/{data}.{ext}`) |
| `documentos` | No (service-role/signed URL only) | Signed PDFs — relatório de turma, presença exportada, diário de aula (path: `{turma\|coach}/{id}/{tipo}/{timestamp}-{filename}`) |
| `notas-fiscais` | No (service-role/signed URL only) | Nota fiscal attachments on a `lancamentos_financeiros` row (path: `{projetoId}/{categoriaId}/{timestamp}-{filename}`) |
| `financeiro-arquivos` | No (service-role/signed URL only) | General projeto attachments — plano de trabalho, convênio, edital (path: `{projetoId}/{timestamp}-{filename}`) |

---

## Custom Design Tokens (Tailwind v4)

Defined in `app/globals.css` via `@theme`:

```
navy-500      = #0C143D   (primary dark blue — sidebar background, headings)
navy-600      = #0a1133   (sidebar hover state)
sky-400       = #2AABE1   (accent blue — active nav items, links, focus rings)
brand-red-500 = #EB2127   (danger / logout button hover)
```

---

## Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`). Use `@/lib/...`, `@/components/...`, `@/types/...`, etc.

---

## Deployment

Deployed on Vercel (project: `adtrisc`) via the GitHub integration: **every push to `main` on `muriloburigo/adtrisc` rebuilds production from the repo.**

```bash
npm run build          # verify locally first
git push origin main   # the only way to deploy to production
```

**Never run `vercel` / `vercel --prod` / `vercel deploy` from the local folder.** A CLI deploy uploads the working tree, including uncommitted code. That code then disappears from production on the next push to `main`. This happened in Sep/2026: the `/financeiro` area went live via `vercel --prod` without being committed, and a later push took it offline for 9 days. The project's `.claude/settings.json` denies these commands.

`vercel.json` sets framework to `nextjs` with standard build/install commands. No custom headers, rewrites, or edge functions configured.

**`site/`** (static institutional site + Portal da Transparência, a single `index.html`) is a **separate Vercel project, `adtrisc-site`** (`site/.vercel/project.json`), served at `adtrisc-site.vercel.app`. Unlike the app it is **not connected to Git** — it has only ever been published with the CLI from `site/`. As of 30/09/2026 the live page is byte-identical to `site/index.html` on `main`. Since CLI deploys are denied for agents in this repo, publishing a change to the site needs either the maintainer running `vercel --prod` inside `site/` **after committing**, or connecting `adtrisc-site` to the GitHub repo with Root Directory `site`.

---

## Backup & Restore

### Where backups live

Every run writes the **same archive to two places** (3-2-1 rule — one machine, one cloud):

```
~/Backups/adtrisc/<YYYY-MM-DD_HHMM>.tar.gz.gpg                                                    # local, on Murilo's Mac
~/Library/CloudStorage/GoogleDrive-muriloburigo@gmail.com/My Drive/ADTRISC-Backups/<...>.tar.gz.gpg  # synced to Google Drive
```

The Drive copy is a plain `cp` into the folder Google Drive Desktop already syncs — no API/OAuth involved. It's skipped (with a log line, not a failure) if that Drive folder doesn't exist on the machine running the script; the actual cloud upload only happens once Google Drive Desktop is running (it's set to launch at login on this Mac). Both copies get the same 30-day rotation.

**The archive is GPG-encrypted (`--symmetric --cipher-algo AES256`) — never written to disk as a plain `.tar.gz`.** It holds real CPF/RG, medical-condition text, and signatures for both athletes and their guardians in plain-text columns (no column-level encryption in the database itself), so the compressed archive is the only thing standing between that data and anyone who gets a copy of the file (local disk access, or the Google Drive account). The plaintext `.tar.gz` is deleted immediately after encryption, before the Drive copy step, so it's never synced. Decrypting needs `BACKUP_ENCRYPTION_PASSPHRASE` from `~/.adtrisc-backup.env` — see below.

Each archive contains:

```
database.sql       # pg_dump of the public schema — all tables, RLS policies, functions, triggers
auth_users.csv      # id, email, created_at, last_sign_in_at, full_name for every login account
                     # (NEVER includes the password hash)
storage/
  avatars/           # athlete profile photos
  fotos/             # class photos (turma_fotos + diário "foto do dia")
  documentos/        # signed PDFs (relatório de turma, presença, diário)
  notas-fiscais/     # invoice attachments of lançamentos_financeiros
  financeiro-arquivos/ # project attachments (projeto_arquivos)
```
`backup-storage.mjs` lists the buckets from the Supabase project itself (`storage.listBuckets()`), so a bucket created by a new feature is backed up automatically — until 30/09/2026 it used a hardcoded list and `notas-fiscais`/`financeiro-arquivos` were silently missing. It pages through folders (no 1,000-file cap) and exits non-zero if any file fails to download, so a partial storage backup is retried instead of saved.

**Mapping rule (what makes restore mechanical, not something to figure out by hand):** each folder directly under `storage/` **is** a bucket name, and everything inside it is the exact object path inside that bucket — `storage/avatars/alunos/{uuid}.jpg` came from (and goes back to) the `avatars` bucket at object key `alunos/{uuid}.jpg`. Restoring never requires knowing or reconstructing paths by hand: `restore-storage.mjs` (below) walks `storage/`, treats each top-level folder as a bucket, and re-uploads every file at its relative path — including any future bucket, since it auto-detects folders instead of a hardcoded list.

### How it runs

- **Automatic**: a macOS LaunchAgent runs `scripts/backup/backup.sh` (plain `/bin/bash`; the script itself starts `caffeinate -i -w $$`) at **03:00, 12:30 and 20:30**. Never make `/usr/bin/caffeinate` the plist's program: macOS privacy blocks it from reading the script in `~/Documents` and the job dies with "Operation not permitted" (exit 126) — that happened on 30/09/2026. The first run of the day that succeeds creates the backup; later runs see today's `.tar.gz.gpg` and exit without doing anything. Why three times: from 23 to 30/09/2026 every 3 AM run failed silently — the Mac wakes in Power Nap with flaky network and `pg_dump` died with "server closed the connection unexpectedly".
  - Versioned copy: `scripts/backup/com.adtrisc.backup.plist`. After editing it, reinstall with:
    `cp scripts/backup/com.adtrisc.backup.plist ~/Library/LaunchAgents/ && launchctl bootout gui/$(id -u)/com.adtrisc.backup; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.adtrisc.backup.plist`
  - Every network step (pg_dump, auth export, storage) gets up to 3 attempts, 60 s apart.
  - **On failure** the half-written folder is deleted (it holds plaintext CPF/RG) and a macOS notification "Backup ADTRISC falhou" is shown. Log: `~/Library/Logs/adtrisc-backup.log`.
- **Manual**: `bash scripts/backup/backup.sh` from the project root (add `--force` to make an extra backup on a day that already has one).
- **Requires** a secrets file at `~/.adtrisc-backup.env` (chmod 600, never committed):
  ```
  SUPABASE_DB_PASSWORD=<database password, from Supabase Dashboard → Project Settings → Database>
  BACKUP_ENCRYPTION_PASSPHRASE=<a long random passphrase, e.g. `openssl rand -base64 32`>
  DB_HOST=<Supabase pooler host, e.g. aws-1-sa-east-1.pooler.supabase.com>
  DB_USER=<Supabase pooler user, postgres.<project-ref>>
  ```
  `SUPABASE_DB_PASSWORD` is the Postgres role password — different from the anon/service-role API keys, and not retrievable after creation (only reset). If it stops working, reset it in the dashboard and update this file. `BACKUP_ENCRYPTION_PASSPHRASE` is what every archive is encrypted with — also save it in a password manager, not just this file: if this file and your password manager are both gone, every backup is unrecoverable ciphertext, forever.

⚠️ The `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` used for the storage part of the backup are read from **this project's `.env.local`** and explicitly override anything already exported in the shell. If you ever add a global Supabase env var to `~/.zshrc` for some other project, the backup will refuse to run (it checks the URL matches the `adtrisc` project ref) instead of silently backing up the wrong project — this happened once and it's why the check exists.

### Restore — same Supabase project still exists (most common case)

Use this when you need to undo bad data (accidental bulk delete, a bug that corrupted rows) but the Supabase project itself is fine.

1. Pick a backup, decrypt it, and extract it (from either copy — same file, `~/Backups/adtrisc/` or the Google Drive folder):
   ```bash
   cd ~/Backups/adtrisc
   source ~/.adtrisc-backup.env
   gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
     --decrypt 2026-09-11_1428.tar.gz.gpg > 2026-09-11_1428.tar.gz
   tar -xzf 2026-09-11_1428.tar.gz
   rm 2026-09-11_1428.tar.gz # não deixa a versão sem senha no disco depois de extrair
   ```
2. Restore the database (⚠️ this overwrites current data — coordinate downtime, or restore into a scratch database first to inspect/cherry-pick):
   ```bash
   PGPASSWORD=<db password> psql \
     --host=aws-1-sa-east-1.pooler.supabase.com --port=5432 \
     --username=postgres.gjsbxpdkfmqtfwkdcbxh --dbname=postgres \
     -f 2026-09-11_1428/database.sql
   ```
   For a single table instead of everything, extract just that table's `CREATE TABLE`/`COPY` block from `database.sql` and run it, or restore into a fresh local Postgres and copy rows over with `\copy`.
3. Re-upload storage files (only needed if files were actually lost — the DB restore above doesn't touch Storage). One command restores **every bucket in the backup** — it auto-detects them from the folder names under `storage/` (see mapping rule above) and is safe to re-run (upsert):
   ```bash
   node --env-file=.env.local scripts/backup/restore-storage.mjs 2026-09-11_1428/storage
   ```
   It refuses to run if `.env.local` (or an env var leaking in from the shell) doesn't point at the `adtrisc` project — same safety check as the backup script, just as important in reverse since this one writes.

### Restore — full disaster (Supabase project or Vercel account lost entirely)

This is the unlikely worst case. Steps, roughly in order:

1. **Create a new Supabase project.** Note the new project ref/URL and grab the new anon key, service-role key, and DB password from Project Settings → API / Database.
2. **Rebuild the schema**: run every file in `supabase/*.sql` against the new project's SQL editor, **in this exact order** (each file's header comment says "Run this in the Supabase SQL editor"; several later files call `coach_has_turma()` or alter tables created earlier, so order isn't cosmetic — running them out of order will error):
   1. `schema_v2.sql` — core tables + `get_my_role()` (`schema.sql` is the old v1 schema — **do not run it**, `schema_v2.sql` superseded it). Note: it also creates a `pagamentos` table that **does not exist in production** and isn't used by any code — harmless on a restore, but don't take it as a live feature.
   2. `turma_coaches.sql` — `turma_coaches` table
   3. `turma_access_scoping.sql` — defines `coach_has_turma()` (needs `turma_coaches`); every file below that uses `coach_has_turma()` must come after this one
   4. `avatars_bucket.sql`, `fotos_bucket.sql` — storage buckets (any order)
   5. `turma_fotos_table.sql` — `turma_fotos` table (undocumented until now — was only ever created by hand in the dashboard)
   6. `turma_fotos_rls.sql` — policies for `turma_fotos` (needs #3 and #5)
   7. `turma_fotos_uma_por_dia.sql` — adds a unique constraint to `turma_fotos`
   8. `fichas_inscricao.sql` — `fichas_inscricao` table
   9. `unificar_fichas_candidatos.sql` — alters `candidatos` + `fichas_inscricao` (needs #8)
   10. `fichas_campos_neutros.sql` — alters `fichas_inscricao` further (needs #8, run after #9)
   11. `provas.sql` — needs `coach_has_turma()` (#3)
   12. `documentos_assinados.sql` — needs `coach_has_turma()` (#3)
   13. `documentos_assinados_diario.sql` — alters `documentos_assinados` (needs #12)
   14. `alunos_coach_insert.sql`
   15. `alunos_coach_remove.sql`
   16. `alunos_atribuir_turma.sql`
   17. `alunos_coach_edit.sql` — **must run last of #14-17**: it does `drop policy if exists "alunos_insert_coach"` before recreating it, superseding the policy `alunos_coach_insert.sql` (#14) created
   18. `materias_imprensa.sql`
   19. `soft_delete.sql`
   20. `diario_aulas.sql`
   21. `diario_resumos.sql`
   22. `financeiro.sql` — categorias/projetos/orçamentos/lançamentos tables + `notas-fiscais` bucket (only needs `get_my_role()` from #1, no `coach_has_turma()` dependency)
   23. `financeiro_projeto_extras.sql` — adds `objetivo`/`metas` to `projetos_financeiros` + `projeto_arquivos` table + `financeiro-arquivos` bucket (needs #22)
   24. `avaliacoes_extras_zonas.sql` — new `avaliacoes_fisicas` columns (Dabonneville, maturação, ciclismo 2 km, link) + `zonas_treino` table (needs `coach_has_turma()`, #3)
   25. `testes_campo_proesp.sql` — natação 50/100 m + `altura_banco` columns, `config_avaliacao` table, drops `zonas_treino` (needs #24)

   This recreates all tables, RLS policies, functions, and the storage buckets (empty). If in doubt about a file not listed above (this list is kept in sync manually — check its header comment and grep it for `coach_has_turma`/`alter table` to place it correctly), run `schema_v2.sql` + `turma_coaches.sql` + `turma_access_scoping.sql` first no matter what, since almost everything else depends on one of those three.
3. **Restore the data**: run `psql -f database.sql` against the new project (same command as above, new host/user/password). Since the schema from step 2 already exists, either drop the tables first or strip the `CREATE TABLE`/`CREATE POLICY` statements from `database.sql` and keep only the `COPY ... FROM stdin` data sections — running both the schema files and a full `database.sql` back to back will error on "already exists".
4. **Re-upload storage files** — `node --env-file=.env.local scripts/backup/restore-storage.mjs <backup>/storage`, pointed at the new project's `.env.local`. Update `EXPECTED_PROJECT_REF` at the top of `restore-storage.mjs` first (it hard-fails otherwise, on purpose — see step 9).
5. **Recreate user accounts.** `auth_users.csv` has emails/names but *not* passwords — there is no way around this, Supabase never exposes password hashes for security reasons. For each row: create the user in Supabase Auth (dashboard → Authentication → Add user, or `supabase.auth.admin.createUser()`) using the **same `id`** from the CSV if at all possible (many tables have `profile_id`/`enviado_por`/etc. foreign keys pointing at these UUIDs) and send them a password-reset email. If preserving the same `id` isn't possible, the FK references in the restored data will be dangling for that user — acceptable but worth knowing.
6. **Update secrets everywhere**:
   - `.env.local` (local dev) — new URL, anon key, service-role key.
   - Vercel → Project Settings → Environment Variables — set the same three for **both** Production and Development (see gotcha above: if only Production is set, `vercel env pull` returns nothing locally).
   - `~/.adtrisc-backup.env` — new DB password.
7. **Reconfigure things that live outside the database and aren't backed up at all:**
   - Supabase Auth settings: email templates, redirect URLs, site URL (Authentication → URL Configuration).
   - Any custom domain on Vercel, if one was ever added (currently just `adtrisc.vercel.app`).
8. **Redeploy**: Vercel dashboard → Deployments → latest `main` deployment → Redeploy (or push a commit to `main`). Don't use `vercel --prod` (see Deployment).
9. Update `NEXT_PUBLIC_SUPABASE_URL` in this file's Environment Variables section and anywhere else the old project ref (`gjsbxpdkfmqtfwkdcbxh`) is hardcoded — notably `DB_HOST`/`DB_USER` in `~/.adtrisc-backup.env` and the `EXPECTED_PROJECT_REF` constant in both `scripts/backup/backup-storage.mjs` and `scripts/backup/restore-storage.mjs`.

### What a restore can never give back

- **User passwords** — by design, nobody (not Supabase, not this backup) can recover them. Every account needs a password reset after a full-disaster restore.
- **Auth configuration** — email templates, redirect/site URLs, any OAuth provider setup. Not stored in the database at all.
- **Vercel project settings** — custom domains, non-Supabase env vars, deployment protection settings.
- **The backups themselves, if `BACKUP_ENCRYPTION_PASSPHRASE` is lost** — it's only in `~/.adtrisc-backup.env` and (hopefully) a password manager. Lose both and every `.tar.gz.gpg` ever made is permanent, unrecoverable ciphertext — there's no vendor or admin backdoor for GPG symmetric encryption.

---

## Important Conventions

- **Server Actions** are used for all mutations — no API routes for CRUD. Every action file starts with `'use server'`.
- **`requireStaff()` / `requireAdmin()`** must be called at the top of any Server Action that writes data. They throw `Error('Acesso negado')` if the session lacks the required role — **but they only check role, never *which* turma/aluno**. Any action that also uses `createAdminClient()` (bypasses RLS) for its actual reads/writes on a turma- or aluno-scoped table needs its **own** ownership check on top of `requireStaff()`, or a coach can act on another coach's turma/athletes. This exact gap existed in `fichas/actions.ts` (any coach could create/invalidate/delete any athlete's enrollment form) until it was fixed by adding `assertAlunoAccess()`/`assertTurmaAccess()` helpers there — they re-run the lookup through the normal RLS-scoped client (`createClient()`) and treat "row not visible" as "access denied," reusing the exact same `coach_has_turma()`-based policies as the rest of the app instead of reinventing the scoping logic. Copy that pattern for any new admin-client action scoped to a turma or aluno. (Actions that read/write through the normal RLS-scoped client, like `lib/documentosAssinados.ts`, don't need this — RLS already enforces it for them.)
- **`logAudit()`** must be called after every successful write in admin/coach actions.
- **Soft deletes** on `presencas` and `avaliacoes_fisicas` — always filter with `.is('deleted_at', null)` when querying these tables.
- **`historico_atleta`** is appended automatically in `alunos/actions.ts` whenever an athlete's `turma_id` or `status` changes — do not skip this when writing updates.
- **`as any` casts** are used heavily on Supabase client calls because `types/database.ts` only covers `profiles`, `turmas`, and `alunos`. Adding full types for all tables is a known improvement opportunity.
- The entire app is in **Brazilian Portuguese** — UI labels, error messages, and date formatting all use `pt-BR` locale.
