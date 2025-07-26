# Fraud Detection Service

Example service performing simple rule-based fraud checks. Monitors IP and device fingerprints.

## Development
```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Docker
```bash
docker compose up --build
```
