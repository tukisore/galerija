#!/usr/bin/env bash
# Restores the database and the media files from a snapshot in the backup folder, replacing the
# current ones: ./restore.sh to list the snapshots, ./restore.sh <snapshot id or "latest"> to restore.
# The current state is backed up first, so a restore can itself be undone.
set -euo pipefail
cd "$(dirname "$0")"
export MSYS_NO_PATHCONV=1

if [ $# -eq 0 ]; then
  docker compose run --rm backup snapshots --tag galerija
  echo "Restore one with: $0 <snapshot id or latest>"
  exit 0
fi
snapshot="$1"

read -r -p "Replace the current database and media with snapshot $snapshot? [y/N] " answer
[ "$answer" = "y" ] || [ "$answer" = "Y" ] || exit 1

# picked before the backup below, which becomes the new latest
if [ "$snapshot" = "latest" ]; then
  snapshot=$(docker compose run --rm backup snapshots --tag galerija --latest 1 --json |
    grep -o '"short_id":"[^"]*"' | tail -n 1 | cut -d'"' -f4)
fi

echo "Backing up the current state first..."
./backup.sh

docker compose stop backend

echo "Restoring $snapshot..."
mkdir -p .backup-tmp
docker compose run --rm --entrypoint sh backup -c '
  set -e
  restic restore "$1" --target /tmp/restore
  find /data/media -mindepth 1 -delete
  cp -a /tmp/restore/data/media/. /data/media/
  cp /tmp/restore/data/db/db.sql /data/db/db.sql
' sh "$snapshot"

docker compose exec -T postgres sh -c \
  'psql -q -v ON_ERROR_STOP=1 --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < .backup-tmp/db.sql
rm -f .backup-tmp/db.sql

docker compose start backend
echo "Restored $snapshot."
