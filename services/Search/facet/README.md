# Facet Service

Provides product filtering and aggregation. It currently exposes a simple in-memory facet count API.

## Development

```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Docker

```bash
docker compose up --build
```
