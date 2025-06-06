# Analytics Service Minimum Requirements

This document lists the essential information needed to integrate with the Analytics microservice.

## Base URL

- **HTTP**: `http://<host>:8000`

## Required Headers

- `Content-Type: application/json`

## Example Endpoints

- `GET /metrics` – retrieve aggregated metrics
- `POST /events` – submit an analytics event
- `GET /prometheus` – Prometheus scraping endpoint

### Submit Event Example

```json
POST /events
{
  "event_type": "view",
  "payload": {"product_id": 1}
}
```

Refer to `openapi.yaml` for the full schema.
