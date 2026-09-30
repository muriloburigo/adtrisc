#!/usr/bin/env bash
# Full local backup of the ADTRISC Supabase project: database (schema `public`),
# a no-password list of auth accounts, and every storage bucket. Compresses
# everything into one .tar.gz, encrypts it (the archive holds real
# CPF/RG/medical data in plain text — the .tar.gz itself must never sit on
# disk unencrypted), and rotates backups older than
# KEEP_DAYS. The plaintext .tar.gz is deleted right after encryption, before
# the Google Drive copy step, so it's never written to the synced folder.
#
# Requires a secrets file at $HOME/.adtrisc-backup.env (chmod 600) containing:
#   SUPABASE_DB_PASSWORD=<your Supabase DB password>
#     (Project Settings > Database > Database password, on supabase.com/dashboard)
#   BACKUP_ENCRYPTION_PASSPHRASE=<a long random passphrase>
#     (also save this in a password manager — if this file and your password
#     manager are both gone, the backups are unrecoverable ciphertext)
#   DB_HOST=<Supabase pooler host, e.g. aws-1-sa-east-1.pooler.supabase.com>
#   DB_USER=<Supabase pooler user, e.g. postgres.<project-ref>>
#     (kept out of this tracked script on purpose — GitGuardian flagged the
#     project ref embedded in DB_USER as a "Generic Database Assignment" even
#     though it's already public via NEXT_PUBLIC_SUPABASE_URL; moving it here
#     avoids the false-positive noise without changing what's actually secret)
set -euo pipefail

# launchd invoca com um PATH mínimo (sem /opt/homebrew/bin) — sem isso,
# pg_dump/psql/node/gpg não são encontrados quando o job roda sozinho às 3h,
# mesmo funcionando normal rodado manualmente num terminal interativo.
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

PROJECT_DIR="/Users/muriloburigo/Documents/Projects/adtrisc"
BACKUP_ROOT="${ADTRISC_BACKUP_DIR:-$HOME/Backups/adtrisc}"
SECRETS_FILE="$HOME/.adtrisc-backup.env"
KEEP_DAYS=30
# Segunda cópia (regra 3-2-1) — pasta sincronizada pelo Google Drive Desktop.
# Se o Drive não estiver instalado/montado nesta máquina, o backup local
# continua normalmente e só pula essa etapa (não falha o backup por isso).
DRIVE_BACKUP_DIR="$HOME/Library/CloudStorage/GoogleDrive-muriloburigo@gmail.com/My Drive/ADTRISC-Backups"

DB_PORT=5432
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
if [[ -z "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  echo "BACKUP_ENCRYPTION_PASSPHRASE not set in $SECRETS_FILE" >&2
  exit 1
fi
if [[ -z "${DB_HOST:-}" ]]; then
  echo "DB_HOST not set in $SECRETS_FILE" >&2
  exit 1
fi
if [[ -z "${DB_USER:-}" ]]; then
  echo "DB_USER not set in $SECRETS_FILE" >&2
  exit 1
fi

# O launchd dispara o job em mais de um horário (ver com.adtrisc.backup.plist):
# se já existe um backup completo de hoje, os disparos seguintes não fazem nada.
# `backup.sh --force` ignora essa checagem (backup manual extra).
if [[ "${1:-}" != "--force" ]] && compgen -G "$BACKUP_ROOT/$(date +%Y-%m-%d)_*.tar.gz.gpg" > /dev/null; then
  log "Já existe backup de hoje em $BACKUP_ROOT — nada a fazer."
  exit 0
fi

# Impede o Mac de dormir enquanto este script estiver vivo. Fica aqui, e não
# no plist: com /usr/bin/caffeinate como programa do LaunchAgent, o macOS
# (privacidade > pasta Documentos) barra a leitura deste script e o job morre
# com "Operation not permitted" antes de começar.
caffeinate -i -w $$ &

TIMESTAMP="$(date +%Y-%m-%d_%H%M)"
DEST="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$DEST"

# Falha nunca pode ser silenciosa (de 23 a 30/09/2026 todo backup falhou sem
# ninguém perceber): limpa o que ficou pela metade e avisa na tela do Mac.
on_exit() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then
    rm -rf "$DEST" "$DEST.tar.gz"
    log "BACKUP FALHOU (código $rc) — nada foi salvo em $DEST"
    osascript -e 'display notification "O backup automático falhou. Veja ~/Library/Logs/adtrisc-backup.log" with title "Backup ADTRISC falhou" sound name "Basso"' 2>/dev/null || true
  fi
}
trap on_exit EXIT

# A rede cai quando o Mac acorda "meio dormindo" (Power Nap) de madrugada —
# o pg_dump morria com "server closed the connection unexpectedly". Cada etapa
# de rede tem até 3 tentativas, com 60 s entre elas.
tentar() {
  local n=1
  until "$@"; do
    if (( n >= 3 )); then return 1; fi
    log "Falhou (tentativa $n/3) — tentando de novo em 60 s..."
    sleep 60
    n=$((n + 1))
  done
}

log "Starting backup -> $DEST"

log "Dumping database (schema public)..."
tentar env PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
  --no-owner --no-privileges --schema=public \
  --file="$DEST/database.sql"

log "Exporting account list (auth.users, sem senha)..."
# Só o essencial pra recriar contas manualmente num desastre total (projeto
# Supabase inteiro perdido) — nunca o hash de senha. Cada pessoa reseta a
# própria senha por e-mail depois de restaurada.
tentar env PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
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
baixar_storage() {
  rm -rf "$DEST/storage" # recomeça do zero a cada tentativa
  NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL_LOCAL" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_LOCAL" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_LOCAL" \
    node scripts/backup/backup-storage.mjs "$DEST/storage"
}
tentar baixar_storage

log "Compressing..."
tar -czf "$DEST.tar.gz" -C "$BACKUP_ROOT" "$TIMESTAMP"
rm -rf "$DEST"

log "Encrypting (AES256, symmetric)..."
gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" \
  --symmetric --cipher-algo AES256 --output "$DEST.tar.gz.gpg" "$DEST.tar.gz"
rm -f "$DEST.tar.gz" # nunca deixa a versão sem senha no disco, nem por um instante a mais

SIZE="$(du -h "$DEST.tar.gz.gpg" | cut -f1)"
log "Backup complete: $DEST.tar.gz.gpg ($SIZE)"

log "Rotating backups older than $KEEP_DAYS days..."
find "$BACKUP_ROOT" -maxdepth 1 -name "*.tar.gz.gpg" -mtime "+$KEEP_DAYS" -print -delete

if [[ -d "$HOME/Library/CloudStorage/GoogleDrive-muriloburigo@gmail.com/My Drive" ]]; then
  log "Copying to Google Drive..."
  mkdir -p "$DRIVE_BACKUP_DIR"
  cp "$DEST.tar.gz.gpg" "$DRIVE_BACKUP_DIR/"
  chmod 600 "$DRIVE_BACKUP_DIR/$TIMESTAMP.tar.gz.gpg"
  find "$DRIVE_BACKUP_DIR" -maxdepth 1 -name "*.tar.gz.gpg" -mtime "+$KEEP_DAYS" -print -delete
  log "Copied to Drive: $DRIVE_BACKUP_DIR/$TIMESTAMP.tar.gz.gpg"
else
  log "Google Drive folder not found — skipping second copy (local backup still complete)."
fi

chmod 600 "$DEST.tar.gz.gpg"
log "Done."
