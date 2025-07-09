#!/bin/bash
# Run Notification service for debugging
cd "$(dirname "$0")"
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
