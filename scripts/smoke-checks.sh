#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:8000}"
KONG_ADMIN_URL="${KONG_ADMIN_URL:-http://127.0.0.1:8001}"
BFF_URL="${BFF_URL:-http://localhost:9080}"
AUTH_URL="${AUTH_URL:-http://localhost:7000}"
CART_URL="${CART_URL:-http://localhost:5010}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:7002}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:8210}"
ANALYTICS_URL="${ANALYTICS_URL:-http://localhost:8100}"
USER_URL="${USER_URL:-http://localhost:5003}"
SHIPPING_URL="${SHIPPING_URL:-http://localhost:5004}"

echo "Running smoke checks..."

curl -fsS "${KONG_ADMIN_URL}/status" >/dev/null
echo "✓ kong admin /status"

curl -fsS "${BFF_URL}/healthz" >/dev/null
curl -fsS "${BFF_URL}/readyz" >/dev/null
echo "✓ bff /healthz /readyz"

curl -fsS "${AUTH_URL}/healthz" >/dev/null
curl -fsS "${AUTH_URL}/readyz" >/dev/null
echo "✓ auth /healthz /readyz"

curl -fsS "${INVENTORY_URL}/healthz" >/dev/null
curl -fsS "${INVENTORY_URL}/readyz" >/dev/null
curl -fsS "${ANALYTICS_URL}/healthz" >/dev/null
curl -fsS "${ANALYTICS_URL}/readyz" >/dev/null
echo "✓ inventory + analytics /healthz /readyz"

curl -fsS "${USER_URL}/healthz" >/dev/null
curl -fsS "${USER_URL}/readyz" >/dev/null
curl -fsS "${SHIPPING_URL}/healthz" >/dev/null
curl -fsS "${SHIPPING_URL}/readyz" >/dev/null
echo "✓ user + shipping /healthz /readyz"

curl -fsS "${CART_URL}/healthz" >/dev/null
curl -fsS "${CART_URL}/readyz" >/dev/null
echo "✓ cart /healthz /readyz"

curl -fsS "${PAYMENT_URL}/healthz" >/dev/null
curl -fsS "${PAYMENT_URL}/readyz" >/dev/null
echo "✓ payment /healthz /readyz"

echo "Smoke checks passed."
