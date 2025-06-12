# Payment Service Minimum Requirements

This document lists the minimal information required by integrators to call the Payment microservice.

## Base URLs

- **gRPC**: `grpc://<host>:7001`
- **HTTP (gRPC Gateway)**: `http://<host>:8080`

## Required Headers

- `Content-Type: application/json` for HTTP requests

## Example Request

```json
POST /v1/payment
{
  "order_id": "<ORDER_ID>",
  "amount": 100.0
}
```

## Success Response

```json
{
  "payment_id": "<PAYMENT_ID>",
  "status": "PAID"
}
```

Refer to `openapi.yaml` for full schema.
