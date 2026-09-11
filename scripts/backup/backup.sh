#!/usr/bin/env bash
# Full local backup of the ADTRISC Supabase project: database (schema `public`),
# a no-password list of auth accounts, and storage buckets (avatars, fotos,
# documentos). Compresses everything into one .tar.gz per run and rotates
# backups older than KEEP_DAYS.
#
# Requires a secrets file at $HOME/.adtrisc-backup.env containing:
#   SUPABASE_DB_PASSWORD=<your Supabase DB password>
# (Project Settings > Database > Database password, on supabase.com/dashboard)
# chmod 600 that file — never commit it.
set -euo pipefail

PROJECT_DIR="/Users/muriloburigo/Documents/Projects/adtrisc"
BACKUP_ROOT="${ADTRISC_BACKUP_DIR:-$HOME/Backups/adtrisc}"
SECRETS_FILE="$HOME/.adtrisc-backup.env"
KEEP_DAYS=30
# Segunda cópia (regra 3-2-1) — pasta sincronizada pelo Google Drive Desktop.
# Se o Drive não estiver instalado/montado nesta máquina, o backup local
# continua normalmente e só pula essa etapa (não falha o backup por isso).
DRIVE_BACKUP_DIR="$HOME/Library/CloudStorage/GoogleDrive-muriloburigo@gmail.com/My Drive/ADTRISC-Backups"

DB_HOST="aws-1-sa-east-1.pooler.supabase.com"
DB_PORT=5432
DB_USER="postgres.gjsbxpdkfmqtfwkdcbxh"
DB_NAME="postgres"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Missing $SECRETS_FILE with SUPABASE_DB_PASSWORD=... (chmod 600)" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD not set in $SECRETS_FILE" >&2
  exit 1
fi

TIMESTAMP="$(date +%Y-%m-%d_%H%M)"
DEST="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$DEST"

log "Starting backup -> $DEST"

log "Dumping database (schema public)..."
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
  --no-owner --no-privileges --schema=public \
  --file="$DEST/database.sql"

log "Exporting account list (auth.users, sem senha)..."
# Só o essencial pra recriar contas manualmente num desastre total (projeto
# Supabase inteiro perdido) — nunca o hash de senha. Cada pessoa reseta a
# própria senha por e-mail depois de restaurada.
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
  -c "\copy (select id, email, created_at, last_sign_in_at, raw_user_meta_data->>'full_name' as full_name from auth.users order by created_at) to '$DEST/auth_users.csv' with csv header"

log "Downloading storage buckets..."
cd "$PROJECT_DIR"
# Lê as credenciais direto do .env.local e sobrescreve qualquer variável de
# ambiente que porventura já esteja exportada no shell (ex: de outro projeto) —
# --env-file do Node NÃO sobrescreve env vars já setadas, então isso evita
# silenciosamente baixar o storage do projeto errado.
SUPABASE_URL_LOCAL="$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"')"
SUPABASE_ANON_LOCAL="$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"')"
SUPABASE_SERVICE_LOCAL="$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2- | tr -d '"')"
NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL_LOCAL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_LOCAL" \
SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_LOCAL" \
  node scripts/backup/backup-storage.mjs "$DEST/storage"

log "Compressing..."
tar -czf "$DEST.tar.gz" -C "$BACKUP_ROOT" "$TIMESTAMP"
rm -rf "$DEST"

SIZE="$(du -h "$DEST.tar.gz" | cut -f1)"
log "Backup complete: $DEST.tar.gz ($SIZE)"

log "Rotating backups older than $KEEP_DAYS days..."
find "$BACKUP_ROOT" -maxdepth 1 -name "*.tar.gz" -mtime "+$KEEP_DAYS" -print -delete

if [[ -d "$HOME/Library/CloudStorage/GoogleDrive-muriloburigo@gmail.com/My Drive" ]]; then
  log "Copying to Google Drive..."
  mkdir -p "$DRIVE_BACKUP_DIR"
  cp "$DEST.tar.gz" "$DRIVE_BACKUP_DIR/"
  find "$DRIVE_BACKUP_DIR" -maxdepth 1 -name "*.tar.gz" -mtime "+$KEEP_DAYS" -print -delete
  log "Copied to Drive: $DRIVE_BACKUP_DIR/$TIMESTAMP.tar.gz"
else
  log "Google Drive folder not found — skipping second copy (local backup still complete)."
fi

log "Done."
