#!/usr/bin/env bash
set -euo pipefail

KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://127.0.0.1:8001}"
GATEWAY_PUBLIC_URL="${GATEWAY_PUBLIC_URL:-http://localhost:8000}"
BFF_URL="${BFF_URL:-http://localhost:9080}"
AUTH_URL="${AUTH_URL:-http://localhost:7000}"
CART_URL="${CART_URL:-http://localhost:5010}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:7002}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:8210}"
ANALYTICS_URL="${ANALYTICS_URL:-http://localhost:8100}"
USER_URL="${USER_URL:-http://localhost:5003}"
SHIPPING_URL="${SHIPPING_URL:-http://localhost:5004}"
MERCHANT_WEB_URL="${MERCHANT_WEB_URL:-http://localhost:3002}"

echo "Running smoke checks..."

curl -fsS "${KONG_ADMIN_URL}/status" >/dev/null
echo "[ok] kong admin /status"

oidc_status="$(curl -s -o /dev/null -w '%{http_code}' "${GATEWAY_PUBLIC_URL}/auth/oidc/login?redirect=/&tenant_id=public")"
if [[ "${oidc_status}" != "302" ]]; then
  echo "Gateway/BFF OIDC entry returned unexpected status ${oidc_status}" >&2
  exit 1
fi
echo "[ok] gateway /auth/oidc/login"

curl -fsS "${BFF_URL}/healthz" >/dev/null
curl -fsS "${BFF_URL}/readyz" >/dev/null
echo "[ok] bff /healthz /readyz"

curl -fsS "${AUTH_URL}/healthz" >/dev/null
curl -fsS "${AUTH_URL}/readyz" >/dev/null
curl -fsS "${AUTH_URL}/.well-known/openid-configuration" >/dev/null
echo "[ok] auth /healthz /readyz /.well-known/openid-configuration"

curl -fsS "${INVENTORY_URL}/healthz" >/dev/null
curl -fsS "${INVENTORY_URL}/readyz" >/dev/null
curl -fsS "${ANALYTICS_URL}/healthz" >/dev/null
curl -fsS "${ANALYTICS_URL}/readyz" >/dev/null
echo "[ok] inventory + analytics /healthz /readyz"

curl -fsS "${USER_URL}/healthz" >/dev/null
curl -fsS "${USER_URL}/readyz" >/dev/null
curl -fsS "${SHIPPING_URL}/healthz" >/dev/null
curl -fsS "${SHIPPING_URL}/readyz" >/dev/null
echo "[ok] user + shipping /healthz /readyz"

curl -fsS "${CART_URL}/healthz" >/dev/null
curl -fsS "${CART_URL}/readyz" >/dev/null
echo "[ok] cart /healthz /readyz"

curl -fsS "${PAYMENT_URL}/healthz" >/dev/null
curl -fsS "${PAYMENT_URL}/readyz" >/dev/null
echo "[ok] payment /healthz /readyz"

curl -fsS "${MERCHANT_WEB_URL}/" >/dev/null
echo "[ok] merchant web /"

echo "Smoke checks passed."
