# Shipping Service Minimum Requirements

This document lists the minimal information needed to integrate with the Shipping microservice.

## Base URL

- **HTTP**: `http://<host>:5004`

## Required Headers

- `Content-Type: application/json`

## Example Endpoints

- `GET /shipments` – list shipments
- `GET /shipments/{id}` – get shipment by ID
- `POST /shipments` – create a shipment
- `GET /shipments/{id}/tracking` – shipment tracking
- `POST /rates/calculate` – calculate rate
- `POST /shipments/{id}/exception` – sign exception
- `POST /labels/callback` – label callback

### Create Shipment Example

```json
POST /shipments
{
  "orderId": "<ORDER_ID>"
}
```

Refer to `openapi.yaml` for the full schema.
