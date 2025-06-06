# Order Service Minimum Requirements

This document lists the minimum information needed to integrate with the Order microservice.

## Base URL

- **HTTP**: `http://<host>:5002`

## Required Headers

- `Content-Type: application/json`

## Example Endpoints

- `GET /orders` – list all orders
- `GET /orders/{id}` – get order by ID
- `POST /orders` – create a new order

### Create Order Example

```json
POST /orders
{
  "items": [
    {"productName": "Example", "price": 9.99}
  ]
}
```

Refer to `openapi.yaml` for the full schema.
