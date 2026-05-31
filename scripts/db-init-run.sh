#!/bin/sh
set -eu

sleep 2
psql -h "${PGHOST}" -U "${PGUSER}" -d postgres -v DB_PASSWORD="${PGPASSWORD}" -f /scripts/db-init.sql
