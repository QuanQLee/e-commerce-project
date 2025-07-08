# Admin Service Minimum Requirements

This service exposes management endpoints for products, orders and users.

## Base URL

- `http://<host>:8000`

## Health Check

`GET /healthz`

Returns `{"status": "ok"}` when the service is healthy.
