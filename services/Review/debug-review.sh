#!/bin/bash
# Run Review service with hot reload for debugging
cd "$(dirname "$0")"
poetry run uvicorn app.main:app --reload
