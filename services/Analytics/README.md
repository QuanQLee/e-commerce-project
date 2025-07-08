# Analytics Service

This service collects and exposes analytical metrics. It is implemented with **Python 3.12** and **FastAPI**, and uses **Poetry** for dependency management.

Features:
- Event ingestion and storage in PostgreSQL
- Periodic aggregation of metrics via APScheduler
- Prometheus endpoint for service metrics
- Unit tests with pytest and coverage

## Minimum Requirements

- **Database**: PostgreSQL schema `analytics`.
- **Environment Variable** `ConnectionStrings__AnalyticsDb` with the PostgreSQL DSN (e.g. `Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=<your-password>`).
- **Port**: `8000` (HTTP/JSON)

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
4. Run tests with coverage:
   ```bash
   poetry run pytest --cov
   ```

## Docker

Run the service with Docker Compose from this directory:
```bash
docker compose up --build
```
You can still use the root `docker-compose.yml` to start the entire stack if needed.

Refer to `openapi.yaml` for the complete API specification.

## Gateway Registration

The service publishes an OpenAPI 3.1 specification (`openapi.yaml`) which can be
consumed by the API gateway for route aggregation. When deploying, register the
service under the `/analytics` prefix so that `POST /analytics/events` and
`GET /analytics/metrics` are reachable through the gateway.

## CI/CD

An example GitHub Actions workflow is provided in `.github/workflows/analytics-ci.yml`.
It installs dependencies, runs unit tests and builds the Docker image. Adapt the
workflow to your environment for staging and grey releases.
