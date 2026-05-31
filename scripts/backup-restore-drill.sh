#!/usr/bin/env bash
set -euo pipefail

# Backup/restore rehearsal for PostgreSQL in docker-compose environment.
# Non-destructive: restores into a dedicated drill database.

PG_CONTAINER="${PG_CONTAINER:-catalog-postgres}"
PG_USER="${PG_USER:-catalog_admin}"
SOURCE_DB="${SOURCE_DB:-catalog}"
DRILL_DB="${DRILL_DB:-drill_restore_verify}"
BACKUP_PATH="${BACKUP_PATH:-/tmp/drill-backup.sql}"

echo "[DRILL] dumping ${SOURCE_DB} from ${PG_CONTAINER}"
docker exec "$PG_CONTAINER" sh -lc "pg_dump -U ${PG_USER} ${SOURCE_DB} > ${BACKUP_PATH}"

echo "[DRILL] recreating ${DRILL_DB}"
docker exec "$PG_CONTAINER" sh -lc "dropdb -U ${PG_USER} --if-exists ${DRILL_DB}"
docker exec "$PG_CONTAINER" sh -lc "createdb -U ${PG_USER} ${DRILL_DB}"

echo "[DRILL] restoring backup into ${DRILL_DB}"
docker exec "$PG_CONTAINER" sh -lc "psql -U ${PG_USER} -d ${DRILL_DB} -f ${BACKUP_PATH} >/dev/null"

echo "[DRILL] verifying schema/tables"
docker exec "$PG_CONTAINER" sh -lc "psql -U ${PG_USER} -d ${DRILL_DB} -c '\\dt' >/dev/null"

echo "[DRILL] backup-restore rehearsal passed"
