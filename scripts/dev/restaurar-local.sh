#!/usr/bin/env bash
# Restaura o backup mais recente da PRODUÇÃO no Supabase LOCAL (Docker), para
# testar branches sem tocar no banco de produção. Uso, da raiz do projeto:
#
#   supabase start                       # sobe o Supabase local (uma vez)
#   bash scripts/dev/restaurar-local.sh  # copia banco + usuários + arquivos
#   npm run dev                          # usa .env.development.local (local)
#
# - O backup é descriptografado num diretório temporário, apagado no fim
#   (contém CPF/RG/saúde em texto puro — nunca deixar no disco).
# - Usuários locais têm os MESMOS ids da produção (as FKs de profiles batem) e
#   todos a senha de desenvolvimento abaixo. Nenhuma senha real é copiada.
# - Depois aplica as migrations da branch listadas em
#   scripts/dev/migrations-pendentes.txt (as que ainda não estão em produção).
# - Escreve .env.development.local apontando para o Supabase local.
set -euo pipefail
export PATH="/opt/homebrew/bin:$PATH"

SENHA_DEV="${SENHA_DEV:-adtrisc-dev}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"

source "$HOME/.adtrisc-backup.env"
BACKUP="$(ls -t "$HOME"/Backups/adtrisc/*.tar.gz.gpg 2>/dev/null | head -1 || true)"
[[ -n "$BACKUP" ]] || { echo "Nenhum backup em ~/Backups/adtrisc"; exit 1; }

# Credenciais do Supabase local (falha se não estiver rodando).
eval "$(supabase status -o env 2>/dev/null | grep -E '^(API_URL|DB_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
[[ -n "${DB_URL:-}" ]] || { echo "Supabase local não está rodando. Rode: supabase start"; exit 1; }
case "$DB_URL" in *127.0.0.1*|*localhost*) ;; *) echo "DB_URL não é local ($DB_URL) — abortando"; exit 1 ;; esac
PSQL=(psql "$DB_URL" -v ON_ERROR_STOP=1 -q)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "▸ Backup: $(basename "$BACKUP")"
gpg --batch --quiet --pinentry-mode loopback --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" -d "$BACKUP" | tar -xzf - -C "$TMP"
DIR="$TMP/$(ls "$TMP")"

echo "▸ Limpando o banco local (schema public e usuários)"
"${PSQL[@]}" <<'SQL'
drop schema if exists public cascade;
delete from auth.identities;
delete from auth.users;
SQL
# storage.objects/buckets não podem ser apagados direto (proteção do Supabase):
# os buckets são criados se faltarem e os arquivos são reenviados com upsert.

echo "▸ Criando usuários locais com os ids da produção (senha: $SENHA_DEV)"
"${PSQL[@]}" -v senha="$SENHA_DEV" <<SQL
create temp table csv_users (id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, full_name text);
\copy csv_users from '$DIR/auth_users.csv' with csv header
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
       crypt(:'senha', gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', full_name),
       created_at, now(), '', '', '', ''
from csv_users;
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from csv_users;
SQL

echo "▸ Restaurando o banco (schema public)"
"${PSQL[@]}" -f "$DIR/database.sql" > /dev/null

echo "▸ Permissões do Supabase e gatilho de perfil"
"${PSQL[@]}" <<'SQL'
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true), ('fotos', 'fotos', true), ('documentos', 'documentos', false),
  ('notas-fiscais', 'notas-fiscais', false), ('financeiro-arquivos', 'financeiro-arquivos', false)
on conflict (id) do nothing;
SQL

echo "▸ Copiando arquivos (fotos, documentos...) para o Storage local"
if [[ -d "$DIR/storage" ]]; then
  API_URL="$API_URL" SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" node --input-type=module - "$DIR/storage" <<'NODE'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
const raiz = process.argv[2]
const tipos = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' }
let ok = 0, falhas = 0
for (const bucket of readdirSync(raiz)) {
  const andar = (dir) => readdirSync(dir).flatMap((n) => statSync(join(dir, n)).isDirectory() ? andar(join(dir, n)) : [join(dir, n)])
  for (const arq of andar(join(raiz, bucket))) {
    const caminho = relative(join(raiz, bucket), arq).split('\\').join('/')
    const r = await fetch(`${process.env.API_URL}/storage/v1/object/${bucket}/${caminho}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SERVICE_ROLE_KEY}`, 'Content-Type': tipos[extname(arq).toLowerCase()] ?? 'application/octet-stream', 'x-upsert': 'true' },
      body: readFileSync(arq),
    })
    r.ok ? ok++ : falhas++
  }
}
console.log(`  ${ok} arquivo(s) copiado(s)${falhas ? `, ${falhas} falha(s)` : ''}`)
NODE
fi

if [[ -s scripts/dev/migrations-pendentes.txt ]]; then
  echo "▸ Migrations da branch (ainda não aplicadas em produção)"
  while read -r arq; do
    [[ -z "$arq" || "$arq" == \#* ]] && continue
    echo "  - $arq"
    "${PSQL[@]}" -f "supabase/$arq" > /dev/null
  done < scripts/dev/migrations-pendentes.txt
fi

echo "▸ Escrevendo .env.development.local (Supabase local)"
cat > .env.development.local <<ENV
# Gerado por scripts/dev/restaurar-local.sh — Supabase LOCAL (Docker). Não versionar.
# No \`next dev\` este arquivo tem prioridade sobre o .env.local (produção).
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV
# Preserva variáveis de desenvolvimento do Intervals, se existirem num arquivo à parte.
[[ -f .env.intervals.dev ]] && cat .env.intervals.dev >> .env.development.local

echo
echo "✔ Pronto. Rode: npm run dev  →  http://localhost:3000"
echo "  Usuários (senha: $SENHA_DEV):"
"${PSQL[@]}" -At -F'  ' -c "select '   ' || rpad(p.role, 6) || u.email from auth.users u join public.profiles p on p.id = u.id order by p.role, u.email;"
