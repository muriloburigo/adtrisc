#!/usr/bin/env bash
# Full local backup of the ADTRISC Supabase project: database (schema `public`)
# + storage buckets (avatars, fotos). Compresses everything into one .tar.gz
# per run and rotates backups older than KEEP_DAYS.
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

log "Downloading storage buckets..."
cd "$PROJECT_DIR"
node --env-file=.env.local scripts/backup/backup-storage.mjs "$DEST/storage"

log "Compressing..."
tar -czf "$DEST.tar.gz" -C "$BACKUP_ROOT" "$TIMESTAMP"
rm -rf "$DEST"

SIZE="$(du -h "$DEST.tar.gz" | cut -f1)"
log "Backup complete: $DEST.tar.gz ($SIZE)"

log "Rotating backups older than $KEEP_DAYS days..."
find "$BACKUP_ROOT" -maxdepth 1 -name "*.tar.gz" -mtime "+$KEEP_DAYS" -print -delete

log "Done."
