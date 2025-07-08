#!/bin/bash
# Run Payment service for debugging
cd "$(dirname "$0")"
go run ./cmd/server
