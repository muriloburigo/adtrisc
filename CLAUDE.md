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
│   │   ├── candidatos/             # Enrollment applicants queue
│   │   ├── coaches/                # Coach user management (admin only)
│   │   ├── configuracoes/          # User management (admin only)
│   │   ├── auditoria/              # Audit log viewer (admin only)
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
│   ├── password.ts                 # Password validation rules
│   └── utils.ts                    # cn(), formatDate(), formatTelefone(), etc.
├── types/
│   └── database.ts                 # All TypeScript types: enums + row types
├── supabase/
│   ├── schema.sql                  # v1 schema (legacy — do not re-run)
│   ├── schema_v2.sql               # v2 schema with turmas, alunos, responsaveis
│   ├── fichas_inscricao.sql        # fichas_inscricao table migration
│   └── soft_delete.sql             # Adds deleted_at to presencas & avaliacoes_fisicas
├── middleware.ts                   # Auth gate + public route exceptions
├── next.config.ts                  # Minimal (no custom config needed)
├── tsconfig.json                   # Path alias: @/* → ./*
└── vercel.json                     # Build/dev/install commands
```

---

## Authentication

Supabase Auth with cookie sessions via `@supabase/ssr`.

**Middleware** (`middleware.ts`) runs on every request except `_next/static`, `_next/image`, and image files. It:
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

These are called at the top of Server Actions to enforce authorization. The dashboard layout also does a redundant `redirect('/login')` check.

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
- `id` (uuid, FK → auth.users), `email`, `full_name`, `role` (UserRole), `avatar_url`

**`turmas`** — training classes
- `id`, `nome`, `modalidade` (TurmaModalidade), `dias_semana` (DiaSemana[]), `horario_inicio`, `horario_fim`, `coach_id` (FK → profiles), `capacidade`, `ano`, `semestre` (1|2), `idade_min`, `idade_max`, `captacao_aberta` (bool), `status` (TurmaStatus), `observacoes`

**`alunos`** — athletes/students
- `id`, `turma_id` (FK → turmas), `profile_id` (FK → profiles, nullable), `nome`, `telefone`, `sexo` (SexoEnum), `data_nascimento`, address fields (`rua`, `numero`, `bairro`, `cep`, `cidade`), `foto_url`, `status` (AlunoStatus), `observacoes`

**`responsaveis`** — parents/guardians
- `id`, `profile_id` (FK → profiles, nullable), `nome`, `cpf`, `rg`, `email`, `telefone`, `parentesco` (Parentesco)

**`aluno_responsavel`** — junction table linking athletes to guardians
- `aluno_id`, `responsavel_id`, `principal` (bool — mae is set as principal by default)

**`turma_fotos`** — class photo gallery
- `id`, `turma_id`, `url`, `titulo`, `data`, `storage_path`

**`avaliacoes_fisicas`** — fitness assessments (soft-deleted via `deleted_at`)
- `id`, `aluno_id`, `data`, `massa_corporal`, `estatura`, `imc` (auto-computed), `resistencia_6min`, `forca_abdominal`, `envergadura`, `impulsao_vertical`, `velocidade_20m`, `flexibilidade`, `observacoes`

**`historico_atleta`** — athlete lifecycle events (auto-written by alunos actions)
- `id`, `aluno_id`, `tipo` (`matricula` | `mudanca_turma` | `desligamento` | `reativacao`), `data`, `turma_id`, `turma_nome`, `turma_anterior_id`, `turma_anterior_nome`

**`presencas`** — attendance records (soft-deleted via `deleted_at`)
- `id`, `aluno_id`, `turma_id`, `data`, `presente` (bool), `justificada` (bool)
- Unique constraint on `(turma_id, aluno_id, data)` — upserted on save

**`candidatos`** — pre-enrollment applicants (from public `/inscricao` form)
- `id`, `turma_id`, `status`, `nome`, `data_nascimento`, `sexo`, `cpf`, `endereco_completo`, health fields (`condicao_medica`, `alergia`, `tratamento_medico` each with boolean + description), `responsavel_*`, `como_soube`, `aceite_termos`, `email_responsavel`, `tem_bicicleta`, `tamanho_camiseta`

**`fichas_inscricao`** — digital enrollment forms sent to parents
- `id`, `token` (uuid, unique — used in public URL `/ficha/{token}`), `aluno_id`, `status` (pendente/preenchida/expirada), pre-filled participant fields (`p_nome`, `p_telefone`, `p_sexo`, `p_data_nascimento`, address), parent fields (`mae_*`, `pai_*`), `responsavel_assina`, `aceite_termos`, `assinatura_data` (base64 PNG), `gerado_por`, `expires_at` (default 30 days from creation)

**`audit_logs`** — all admin/coach write actions
- `id`, `user_id`, `user_name`, `action` (criar/editar/excluir/senha/status/sorteio), `resource` (turma/atleta/treinador/candidato/usuario/presenca), `resource_id`, `resource_label`, `before_data` (JSONB), `after_data` (JSONB), `metadata` (JSONB)

### RLS Summary

- `admin` and `coach` can read most tables.
- Only `admin` can write alunos, responsaveis, turmas (delete), fichas, and user records.
- `pai` can only read their own children and related records (via `aluno_responsavel` join).
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
Full CRUD for athletes. Each athlete has:
- Parents/guardians (responsaveis) managed inline on the same form.
- Timeline showing enrollment history, class changes, deactivations, and fitness assessments.
- Avatar upload (Supabase Storage bucket `avatars`, max 3 MB).

### Attendance (`/presencas`)
Staff selects a class and date, then marks each athlete present/absent/excused. Records are upserted by `(turma_id, aluno_id, data)`. Supports export/print view.

### Fitness Assessments (`/avaliacoes`)
Grid view per class and date. Fields: body mass (kg), height (m), IMC (auto-computed), 6-min run (meters), abdominal strength (reps), wingspan (cm), vertical jump (cm), 20m sprint time (seconds, stored as mm:ss.cc), flexibility (cm). Soft-deleted via `deleted_at`. Individual assessments also accessible from athlete detail page.

### Digital Enrollment Forms (`/ficha/[token]`)
Staff generates a tokenized link per athlete (or in bulk per class). Parents open the public URL, review pre-filled data, add guardian details, and sign digitally (base64 PNG signature). The form is fully unauthenticated — uses service role client. Admin can invalidate (expire) a form from the athlete detail page.

### Audit Log (`/auditoria`)
Admin-only. Shows all write actions with actor, resource, and before/after diffs. Sensitive fields (`id`, `created_at`, `updated_at`, `password`, `avatar_url`, `captacao_aberta`) are stripped before logging.

### User / Coach Management
- `/coaches` — Admin creates/edits/deletes coach accounts using `auth.admin` APIs.
- `/configuracoes` — Admin views all auth users, edits name/role, deletes users.
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

| Bucket | Used for |
|--------|----------|
| `avatars` | Athlete profile photos (path: `{folder}/{uuid}.{ext}`) |
| `fotos` | Class photo gallery (path: `turmas/{turmaId}/{timestamp}.{ext}`) |

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

Deployed on Vercel (project: `adtrisc`).

```bash
vercel          # Preview deploy
vercel --prod   # Production deploy
```

`vercel.json` sets framework to `nextjs` with standard build/install commands. No custom headers, rewrites, or edge functions configured.

---

## Important Conventions

- **Server Actions** are used for all mutations — no API routes for CRUD. Every action file starts with `'use server'`.
- **`requireStaff()` / `requireAdmin()`** must be called at the top of any Server Action that writes data. They throw `Error('Acesso negado')` if the session lacks the required role.
- **`logAudit()`** must be called after every successful write in admin/coach actions.
- **Soft deletes** on `presencas` and `avaliacoes_fisicas` — always filter with `.is('deleted_at', null)` when querying these tables.
- **`historico_atleta`** is appended automatically in `alunos/actions.ts` whenever an athlete's `turma_id` or `status` changes — do not skip this when writing updates.
- **`as any` casts** are used heavily on Supabase client calls because `types/database.ts` only covers `profiles`, `turmas`, and `alunos`. Adding full types for all tables is a known improvement opportunity.
- The entire app is in **Brazilian Portuguese** — UI labels, error messages, and date formatting all use `pt-BR` locale.
