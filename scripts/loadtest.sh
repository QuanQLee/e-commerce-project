#!/bin/bash
# Simple load test against the gateway using hey

DURATION=${DURATION:-30s}
CONCURRENCY=${CONCURRENCY:-50}
URL=${URL:-http://localhost:8000/api/v1/catalog/products}
OUTPUT=${OUTPUT:-loadtest.log}

if ! command -v hey >/dev/null 2>&1; then
    echo "hey is required. Install from https://github.com/rakyll/hey" >&2
    exit 1
fi

echo "Running load test for $DURATION with $CONCURRENCY users against $URL"
hey -z "$DURATION" -c "$CONCURRENCY" "$URL" | tee "$OUTPUT"
