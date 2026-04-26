#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DATA_DIR="./data"
BACKUP_DIR="$DATA_DIR/backups"
SOURCE="$DATA_DIR/local.db"

if [ ! -f "$SOURCE" ]; then
  echo "no DB at $SOURCE; nothing to back up" >&2
  exit 0
fi

mkdir -p "$BACKUP_DIR"

# A plain cp of a WAL-mode sqlite file is safe enough for a personal blog —
# worst case is a rollback to the last completed write. For a stricter guarantee
# we'd shell into the container and run `.backup`, but that adds complexity for
# negligible benefit here.
cp "$SOURCE" "$BACKUP_DIR/local.db.$(date +%F-%H%M)"

# Prune anything older than 30 days.
find "$BACKUP_DIR" -name 'local.db.*' -type f -mtime +30 -delete
