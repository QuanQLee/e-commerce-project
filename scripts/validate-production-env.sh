#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-}"

if [[ -n "${ENV_FILE}" ]]; then
  if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Environment file not found: ${ENV_FILE}" >&2
    exit 1
  fi

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    case "${line}" in
      ''|\#*)
        continue
        ;;
      *=*)
        key="${line%%=*}"
        value="${line#*=}"
        key="$(printf '%s' "${key}" | sed 's/[[:space:]]//g')"
        export "${key}=${value}"
        ;;
      *)
        echo "Invalid env line in ${ENV_FILE}: ${line}" >&2
        exit 1
        ;;
    esac
  done < "${ENV_FILE}"
fi

to_lower() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

runtime_environment="$(to_lower "${BFF_ENVIRONMENT:-${KONG_RUNTIME_ENVIRONMENT:-${ASPNETCORE_ENVIRONMENT:-Production}}}")"

if [[ "${runtime_environment}" != "production" ]]; then
  echo "Skipping production validation for environment '${runtime_environment:-unknown}'."
  exit 0
fi

errors=0

fail_check() {
  printf '[error] %s\n' "$1" >&2
  errors=$((errors + 1))
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail_check "${name} must be set."
  fi
}

reject_placeholder() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" ]]; then
    return
  fi

  local lowered
  lowered="$(to_lower "${value}")"

  case "${lowered}" in
    *"__change_me__"*|*"__generate_unique_secret__"*|*"changeme"*|*"admin-secret-dev"*|*"sample-secret-dev"*|*"secondary-secret-dev"*|*"devpassw0rd!"*|*"pass1"*|*"user1"*|*"example.com"*|*"localhost"*|*"storefront.local"*|*"merchant.local"*)
      fail_check "${name} still uses a development placeholder or local address."
      ;;
  esac
}

require_https_url() {
  local name="$1"
  local value="${!name:-}"
  require_var "${name}"
  reject_placeholder "${name}"
  if [[ -n "${value}" && ! "${value}" =~ ^https:// ]]; then
    fail_check "${name} must use https:// in production."
  fi
}

require_custom_scheme_or_https() {
  local name="$1"
  local value="${!name:-}"
  require_var "${name}"
  reject_placeholder "${name}"
  if [[ -n "${value}" && ! "${value}" =~ ^([a-zA-Z][a-zA-Z0-9+.-]*://) ]]; then
    fail_check "${name} must be an absolute URI."
  fi
}

require_boolean_value() {
  local name="$1"
  local expected="$2"
  local value="${!name:-}"
  require_var "${name}"
  if [[ "${value}" != "${expected}" ]]; then
    fail_check "${name} must be '${expected}' in production."
  fi
}

require_integer_value() {
  local name="$1"
  local value="${!name:-}"
  require_var "${name}"
  if [[ -n "${value}" && ! "${value}" =~ ^[0-9]+$ ]]; then
    fail_check "${name} must be an integer."
  fi
}

require_secure_secret() {
  local name="$1"
  local value="${!name:-}"
  require_var "${name}"
  reject_placeholder "${name}"
  if [[ -n "${value}" && "${#value}" -lt 16 ]]; then
    fail_check "${name} must be at least 16 characters."
  fi
}

require_https_csv() {
  local name="$1"
  local raw="${!name:-}"
  require_var "${name}"
  IFS=',' read -r -a values <<< "${raw}"
  if [[ "${#values[@]}" -eq 0 ]]; then
    fail_check "${name} must contain at least one origin."
    return
  fi

  local entry trimmed lowered
  for entry in "${values[@]}"; do
    trimmed="$(printf '%s' "${entry}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    lowered="$(to_lower "${trimmed}")"
    if [[ -z "${trimmed}" ]]; then
      fail_check "${name} contains an empty origin."
      continue
    fi
    if [[ ! "${trimmed}" =~ ^https:// ]]; then
      fail_check "${name} entry '${trimmed}' must use https://."
    fi
    case "${lowered}" in
      *"localhost"*|*"example.com"*|*"storefront.local"*|*"merchant.local"*)
        fail_check "${name} entry '${trimmed}' still points at a placeholder or local address."
        ;;
    esac
  done
}

require_rediss_with_password() {
  local name="$1"
  local value="${!name:-}"
  require_var "${name}"
  if [[ -n "${value}" && ! "${value}" =~ ^rediss://:[^@]+@ ]]; then
    fail_check "${name} must use rediss:// with an explicit password."
  fi
}

require_var "ASPNETCORE_ENVIRONMENT"
require_boolean_value "AUTH_ENABLE_PASSWORD_GRANT_CLIENTS" "false"
require_boolean_value "AUTH_ENABLE_SELF_REGISTRATION" "false"
require_boolean_value "AUTH_ENABLE_BOOTSTRAP_TEST_USER" "false"
require_boolean_value "BFF_ALLOW_PASSWORD_GRANT" "false"
require_boolean_value "BFF_ALLOW_SELF_REGISTRATION" "false"
require_boolean_value "BFF_COOKIE_SECURE" "true"
require_boolean_value "MERCHANT_PASSWORD_LOGIN_ENABLED" "0"
require_boolean_value "MERCHANT_SELF_REGISTRATION_ENABLED" "0"

require_integer_value "AUTH_LOCAL_PASSWORD_MIN_LENGTH"
require_integer_value "KONG_RATE_LIMIT_MINUTE"
require_integer_value "KONG_REQUEST_BODY_LIMIT_MB"

require_https_url "AUTH_PUBLIC_BASE"
require_https_url "AUTH_BFF_REDIRECT_URI"
require_https_url "BFF_REDIRECT_URI"
require_https_csv "BFF_ALLOWED_ORIGINS"
require_https_csv "KONG_CORS_ORIGIN_PRIMARY"
require_https_csv "KONG_CORS_ORIGIN_SECONDARY"
require_https_csv "AUTH_ALLOWED_CORS_ORIGIN_0"
require_https_csv "AUTH_ALLOWED_CORS_ORIGIN_1"

require_custom_scheme_or_https "AUTH_MOBILE_REDIRECT_URI_0"
require_custom_scheme_or_https "BFF_MOBILE_REDIRECT_URIS"

require_secure_secret "KONG_FRONTEND_JWT_SECRET"
require_secure_secret "KONG_ADMIN_JWT_SECRET"
require_secure_secret "AUTH_SAMPLE_CLIENT_SECRET"
require_secure_secret "AUTH_ADMIN_CLIENT_SECRET"
require_secure_secret "AUTH_SECONDARY_ADMIN_CLIENT_SECRET"
require_secure_secret "AUTH_SIGNING_CERTIFICATE_PASSWORD"
require_secure_secret "BFF_CLIENT_SECRET"

require_var "AUTH_SIGNING_CERTIFICATE_PATH"
reject_placeholder "AUTH_SIGNING_CERTIFICATE_PATH"

require_rediss_with_password "BFF_SESSION_REDIS_URL"
require_rediss_with_password "CART_REDIS_URL"

if [[ -n "${PG_ADMIN_PASSWORD:-}" ]]; then
  require_secure_secret "PG_ADMIN_PASSWORD"
elif [[ -n "${DB_PASSWORD:-}" ]]; then
  require_secure_secret "DB_PASSWORD"
else
  fail_check "PG_ADMIN_PASSWORD or DB_PASSWORD must be set."
fi

for password_var in \
  CATALOG_DB_PASSWORD \
  ORDER_DB_PASSWORD \
  USER_DB_PASSWORD \
  SHIPPING_DB_PASSWORD \
  PAYMENT_DB_PASSWORD \
  INVENTORY_DB_PASSWORD \
  ANALYTICS_DB_PASSWORD \
  AUTH_DB_PASSWORD; do
  require_secure_secret "${password_var}"
done

if [[ "${errors}" -gt 0 ]]; then
  printf '[error] production environment validation failed with %s issue(s).\n' "${errors}" >&2
  exit 1
fi

echo "Production environment validation passed."
