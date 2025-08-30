# Shipping Rate Aggregator Service

Aggregates quotes from (simulated) shipping providers and can simulate a label purchase, posting a callback to the Shipping service.

## Endpoints

- POST `/rates` – simple price calculation for tests
- POST `/rates/aggregate` – returns quotes from two simulated providers and the best quote
- POST `/labels/purchase` – simulates buying a label and calls `POST {SHIPPING_API_URL}/labels/callback`
- GET `/healthz` – basic health probe
- GET `/metrics` – Prometheus metrics

Environment variables:
- `SHIPPING_API_URL` (default `http://shipping.api:80`)
