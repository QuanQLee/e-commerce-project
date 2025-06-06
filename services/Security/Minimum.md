# Security Service Minimum Requirements

This document lists the minimal information required to integrate with the Security microservice.

## Base URL

- **HTTP**: `http://<host>:8082`

## Required Headers

- `Content-Type: application/json`
- Authentication headers as defined by the security scheme

## Example Endpoints

- `POST /auth/login` – obtain authentication token
- `POST /risk/order-check` – order risk check
- `POST /risk/payment-check` – payment risk check
- `POST /rate-limit` – rate limiting check
- `POST /audit` – submit audit log

Refer to `openapi.yaml` for full schema details.
