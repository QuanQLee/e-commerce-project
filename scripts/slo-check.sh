#!/usr/bin/env bash
set -euo pipefail

SLO_P95_MS="${SLO_P95_MS:-800}"
SAMPLE_COUNT="${SAMPLE_COUNT:-20}"

TARGETS=(
  "payment:${PAYMENT_HEALTH_URL:-http://localhost:7002/healthz}"
  "inventory:${INVENTORY_HEALTH_URL:-http://localhost:8210/healthz}"
  "promotion:${PROMOTION_HEALTH_URL:-http://localhost:8400/healthz}"
)

function latency_ms() {
  local url="$1"
  local total=0
  local values=()
  for ((i=1; i<=SAMPLE_COUNT; i++)); do
    t=$(curl -s -o /dev/null -w '%{time_total}' "$url")
    ms=$(awk "BEGIN { printf \"%d\", $t * 1000 }")
    values+=("$ms")
  done
  sorted=$(printf '%s\n' "${values[@]}" | sort -n)
  p95_index=$(awk "BEGIN { printf \"%d\", (${SAMPLE_COUNT} * 0.95) }")
  p95=$(printf '%s\n' "$sorted" | sed -n "${p95_index}p")
  echo "$p95"
}

echo "Running SLO checks"
for target in "${TARGETS[@]}"; do
  name="${target%%:*}"
  url="${target#*:}"
  curl -fsS "$url" >/dev/null
  p95=$(latency_ms "$url")
  echo "${name} p95=${p95}ms (${url})"
  if [[ "$p95" -gt "$SLO_P95_MS" ]]; then
    echo "SLO violation on ${name}: p95 ${p95}ms > ${SLO_P95_MS}ms" >&2
    exit 1
  fi
done

echo "SLO checks passed"
