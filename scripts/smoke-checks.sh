#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://localhost:8000}"
BFF_URL="${BFF_URL:-http://localhost:9080}"
AUTH_URL="${AUTH_URL:-http://localhost:7000}"
CART_URL="${CART_URL:-http://localhost:5010}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:7002}"

echo "Running smoke checks..."

curl -fsS "${GATEWAY_URL}/status" >/dev/null
echo "✓ gateway /status"

curl -fsS "${BFF_URL}/healthz" >/dev/null
curl -fsS "${BFF_URL}/readyz" >/dev/null
echo "✓ bff /healthz /readyz"

curl -fsS "${AUTH_URL}/healthz" >/dev/null
curl -fsS "${AUTH_URL}/readyz" >/dev/null
echo "✓ auth /healthz /readyz"

curl -fsS "${GATEWAY_URL}/api/v1/inventory/healthz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/inventory/readyz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/analytics/healthz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/analytics/readyz" >/dev/null
echo "✓ inventory + analytics /healthz /readyz"

curl -fsS "${GATEWAY_URL}/api/v1/user/healthz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/user/readyz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/shipping/healthz" >/dev/null
curl -fsS "${GATEWAY_URL}/api/v1/shipping/readyz" >/dev/null
echo "✓ user + shipping /healthz /readyz"

curl -fsS "${CART_URL}/healthz" >/dev/null
curl -fsS "${CART_URL}/readyz" >/dev/null
echo "✓ cart /healthz /readyz"

curl -fsS "${PAYMENT_URL}/healthz" >/dev/null
curl -fsS "${PAYMENT_URL}/readyz" >/dev/null
echo "✓ payment /healthz /readyz"

echo "Smoke checks passed."
