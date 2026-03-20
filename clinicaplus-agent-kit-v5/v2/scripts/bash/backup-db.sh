#!/usr/bin/env bash
# backup-db.sh — ClinicaPlus
# Uso: ./backup-db.sh [--dest s3|local] [--keep 30]

set -euo pipefail

DEST=${BACKUP_DEST:-local}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="clinicaplus_${TIMESTAMP}.sql.gz"
BACKUP_DIR=${BACKUP_DIR:-/tmp/clinicaplus-backups}

mkdir -p "$BACKUP_DIR"

echo "[backup] Iniciando backup — $TIMESTAMP"

# Dump + compress
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"
SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[backup] ✓ Dump completo — $SIZE"

# Upload (opcional)
if [ "$DEST" = "s3" ]; then
  aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://$BACKUP_S3_BUCKET/backups/$FILENAME"
  echo "[backup] ✓ Uploaded para S3"
  rm "$BACKUP_DIR/$FILENAME"
fi

# Limpar backups antigos
find "$BACKUP_DIR" -name "clinicaplus_*.sql.gz" -mtime +$KEEP_DAYS -delete
echo "[backup] ✓ Backups com mais de $KEEP_DAYS dias removidos"

echo "[backup] ✓ Concluído — $FILENAME"
