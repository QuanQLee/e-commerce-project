#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD is required to provision database roles." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to provision database roles." >&2
  exit 1
fi

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"

services=(
  CATALOG
  ORDER
  USER
  SHIPPING
  PAYMENT
  INVENTORY
  ANALYTICS
  AUTH
)

echo "Provisioning database roles on ${PGHOST}:${PGPORT} as ${PGUSER}."

for service in "${services[@]}"; do
  db_name_var="${service}_DB_NAME"
  db_user_var="${service}_DB_USER"
  db_pass_var="${service}_DB_PASSWORD"

  db_name="${!db_name_var:-}"
  db_user="${!db_user_var:-}"
  db_pass="${!db_pass_var:-}"

  if [[ -z "$db_name" || -z "$db_user" || -z "$db_pass" ]]; then
    echo "Skipping ${service}: missing ${db_name_var}, ${db_user_var}, or ${db_pass_var}."
    continue
  fi

  echo "Ensuring role/database for ${service} (${db_name}/${db_user})."
  psql -v ON_ERROR_STOP=1 \
    -v db_name="$db_name" \
    -v db_user="$db_user" \
    -v db_pass="$db_pass" \
    <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_pass')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = :'db_user'
)\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'db_name'
)\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', :'db_name', :'db_user')\gexec
SQL
done

echo "Done. Verify ownership and apply schema migrations per service."
