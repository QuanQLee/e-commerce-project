# Recommendation Service

This microservice provides simple product recommendations.

Features:
- Recommend related products
- Prometheus metrics for request count
- JSON structured logging
- Health check endpoint
- Unit tests with pytest

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

Refer to `openapi.yaml` for the API specification.
