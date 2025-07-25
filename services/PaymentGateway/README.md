# Payment Gateway Orchestrator

Aggregates providers like Stripe and PayPal and applies simple retry logic. This example exposes minimal FastAPI endpoints.

## Development
```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Docker
```bash
docker compose up --build
```
