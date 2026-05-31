#!/usr/bin/env bash
set -euo pipefail

# Deployment acceptance gate for release/canary pipelines.
# 1) smoke checks
# 2) SLO checks
# 3) optional load test sanity

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_LOADTEST="${RUN_LOADTEST:-false}"
ACCEPTANCE_DRY_RUN="${ACCEPTANCE_DRY_RUN:-false}"
VALIDATE_PRODUCTION_ENV="${VALIDATE_PRODUCTION_ENV:-auto}"

cd "$ROOT_DIR"

should_validate_prod_env() {
  local setting environment
  setting="$(printf '%s' "${VALIDATE_PRODUCTION_ENV}" | tr '[:upper:]' '[:lower:]')"
  case "${setting}" in
    true|1|yes)
      return 0
      ;;
    false|0|no)
      return 1
      ;;
    auto)
      environment="$(printf '%s' "${BFF_ENVIRONMENT:-${KONG_RUNTIME_ENVIRONMENT:-${ASPNETCORE_ENVIRONMENT:-}}}" | tr '[:upper:]' '[:lower:]')"
      [[ "${environment}" == "production" ]]
      return
      ;;
    *)
      echo "Unsupported VALIDATE_PRODUCTION_ENV value: ${VALIDATE_PRODUCTION_ENV}" >&2
      exit 1
      ;;
  esac
}

if [[ "$ACCEPTANCE_DRY_RUN" == "true" ]]; then
  echo "Release acceptance dry run mode"
  bash -n ./scripts/validate-production-env.sh
  bash -n ./scripts/smoke-checks.sh
  bash -n ./scripts/slo-check.sh
  bash -n ./scripts/loadtest.sh
  echo "Dry run passed"
  exit 0
fi

if should_validate_prod_env; then
  bash ./scripts/validate-production-env.sh
fi

bash ./scripts/smoke-checks.sh
bash ./scripts/slo-check.sh

if [[ "$RUN_LOADTEST" == "true" ]]; then
  DURATION="${DURATION:-20s}" CONCURRENCY="${CONCURRENCY:-20}" bash ./scripts/loadtest.sh
fi

echo "Release acceptance checks passed"
