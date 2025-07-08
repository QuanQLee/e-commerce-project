# Notification Service Minimum Requirements

This document summarises how to interact with the Notification API.

## Base URL

- **HTTP**: `http://<host>:8000`

## Example Endpoints

- `POST /email` – queue an email for delivery
- `GET /healthz` – health check
- `GET /prometheus` – Prometheus metrics

### Send Email Example

```json
POST /email
{
  "to": "user@example.com",
  "subject": "Welcome",
  "body": "Thanks for signing up"
}
```

Refer to `openapi.yaml` for the full schema.
