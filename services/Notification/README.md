# Notification Service

This microservice provides email notification capabilities using **FastAPI**. It exposes an endpoint to queue messages which are sent via SMTP.

Features:
- Asynchronous email sending with `aiosmtplib`
- Prometheus metrics for sent/failed emails
- JSON structured logging
- Health check endpoint
- Unit tests with pytest

## Minimum Requirements

- **Environment Variables**:
  - `SMTP_HOST` / `SMTP_PORT` – SMTP server
  - `SMTP_FROM` – sender address
  - Optional `SMTP_USER` / `SMTP_PASSWORD`
- **Port**: `8000`

## Development

1. Install Python 3.12 and [Poetry](https://python-poetry.org/).
2. Install dependencies:
   ```bash
   poetry install
   ```
3. Run the service:
   ```bash
   poetry run uvicorn app.main:app --reload
   ```
4. Run tests:
   ```bash
   poetry run pytest
   ```

## Docker

Run the service via Docker Compose:
```bash
docker compose up --build
```

Refer to `openapi.yaml` for the complete API specification.
