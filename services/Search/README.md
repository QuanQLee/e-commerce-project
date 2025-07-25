# Search Service

Provides product search endpoints using **FastAPI**. It is intended to integrate with a search engine like OpenSearch or Meilisearch.

Features:
- Full text search and autocomplete
- Simple in-memory index for now
- Health check endpoint

## Development

```bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Docker

```bash
docker compose up --build
```
