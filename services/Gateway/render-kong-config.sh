#!/bin/sh
set -eu

template="${KONG_DECLARATIVE_TEMPLATE:-/kong/kong.yml}"
rendered="${KONG_DECLARATIVE_CONFIG:-/tmp/kong.rendered.yml}"
runtime_environment="$(printf '%s' "${KONG_RUNTIME_ENVIRONMENT:-${ASPNETCORE_ENVIRONMENT:-Development}}" | tr '[:upper:]' '[:lower:]')"

export KONG_FRONTEND_JWT_SECRET_RENDERED="${KONG_FRONTEND_JWT_SECRET:-changeme-frontend}"
export KONG_ADMIN_JWT_SECRET_RENDERED="${KONG_ADMIN_JWT_SECRET:-changeme-admin}"
export KONG_CORS_ORIGIN_PRIMARY_RENDERED="${KONG_CORS_ORIGIN_PRIMARY:-https://storefront.local}"
export KONG_CORS_ORIGIN_SECONDARY_RENDERED="${KONG_CORS_ORIGIN_SECONDARY:-https://merchant.local}"
export KONG_RATE_LIMIT_MINUTE_RENDERED="${KONG_RATE_LIMIT_MINUTE:-120000}"
export KONG_AUTH_RATE_LIMIT_MINUTE_RENDERED="${KONG_AUTH_RATE_LIMIT_MINUTE:-300}"
export KONG_REQUEST_BODY_LIMIT_MB_RENDERED="${KONG_REQUEST_BODY_LIMIT_MB:-2}"

validate_production_settings() {
  if [ "${runtime_environment}" != "production" ]; then
    return 0
  fi

  require_value() {
    name="$1"
    value="$2"
    if [ -z "${value}" ]; then
      echo "${name} must be set in production." >&2
      exit 1
    fi
  }

  reject_placeholder() {
    name="$1"
    value="$(printf '%s' "$2" | tr '[:upper:]' '[:lower:]')"
    case "${value}" in
      *changeme*|*example.com*|*localhost*|*storefront.local*|*merchant.local*|*"__generate_unique_secret__"*)
        echo "${name} still uses a placeholder or local value." >&2
        exit 1
        ;;
    esac
  }

  require_https_origin() {
    name="$1"
    value="$2"
    require_value "${name}" "${value}"
    reject_placeholder "${name}" "${value}"
    case "${value}" in
      https://*) ;;
      *)
        echo "${name} must use https:// in production." >&2
        exit 1
        ;;
    esac
  }

  require_value "KONG_FRONTEND_JWT_SECRET" "${KONG_FRONTEND_JWT_SECRET_RENDERED}"
  require_value "KONG_ADMIN_JWT_SECRET" "${KONG_ADMIN_JWT_SECRET_RENDERED}"
  reject_placeholder "KONG_FRONTEND_JWT_SECRET" "${KONG_FRONTEND_JWT_SECRET_RENDERED}"
  reject_placeholder "KONG_ADMIN_JWT_SECRET" "${KONG_ADMIN_JWT_SECRET_RENDERED}"
  require_https_origin "KONG_CORS_ORIGIN_PRIMARY" "${KONG_CORS_ORIGIN_PRIMARY_RENDERED}"
  require_https_origin "KONG_CORS_ORIGIN_SECONDARY" "${KONG_CORS_ORIGIN_SECONDARY_RENDERED}"
}

validate_production_settings

perl -0pe '
  s/__KONG_FRONTEND_JWT_SECRET__/$ENV{KONG_FRONTEND_JWT_SECRET_RENDERED}/g;
  s/__KONG_ADMIN_JWT_SECRET__/$ENV{KONG_ADMIN_JWT_SECRET_RENDERED}/g;
  s/__KONG_CORS_ORIGIN_PRIMARY__/$ENV{KONG_CORS_ORIGIN_PRIMARY_RENDERED}/g;
  s/__KONG_CORS_ORIGIN_SECONDARY__/$ENV{KONG_CORS_ORIGIN_SECONDARY_RENDERED}/g;
  s/__KONG_RATE_LIMIT_MINUTE__/$ENV{KONG_RATE_LIMIT_MINUTE_RENDERED}/g;
  s/__KONG_AUTH_RATE_LIMIT_MINUTE__/$ENV{KONG_AUTH_RATE_LIMIT_MINUTE_RENDERED}/g;
  s/__KONG_REQUEST_BODY_LIMIT_MB__/$ENV{KONG_REQUEST_BODY_LIMIT_MB_RENDERED}/g;
' "$template" > "$rendered"

if [ "${KONG_SKIP_START:-false}" = "true" ]; then
  exit 0
fi

exec /docker-entrypoint.sh kong docker-start
