#!/usr/bin/env bash
# Backs up the database and the media files to the backup folder (BACKUP_DIR, default ./backups)
# as a restic snapshot. Only what changed since the last backup is stored; every snapshot is
# still a full restore point. Needs the compose app running and RESTIC_PASSWORD in .env.
set -euo pipefail
cd "$(dirname "$0")"
# Git Bash on Windows would rewrite the container paths below into Windows paths
export MSYS_NO_PATHCONV=1

mkdir -p .backup-tmp "${BACKUP_DIR:-backups}"

# the database first, then the media, so every file the dump refers to is in the snapshot;
# plain SQL, uncompressed, so restic can store only the parts that changed
echo "Dumping the database..."
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' > .backup-tmp/db.sql

docker compose run --rm --entrypoint sh backup -c '
  set -e
  [ -n "$RESTIC_PASSWORD" ] || { echo "Set RESTIC_PASSWORD in .env next to docker-compose.yml" >&2; exit 1; }
  restic cat config > /dev/null 2>&1 || restic init
  restic backup /data --tag galerija
  # kept: the last 7 days, 4 weeks and 12 months
  restic forget --tag galerija --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
'

rm -f .backup-tmp/db.sql
echo "Backup done."
