# Payment Service Minimum Requirements

This document lists the minimal information required by integrators to call the Payment microservice.

## Base URLs

- **gRPC**: `grpc://<host>:7001`
- **HTTP (gRPC Gateway)**: `http://<host>:8080`

## Required Headers

- `Content-Type: application/json` for HTTP requests

## Basic Payment Endpoints

- `POST /v1/payment`: Create payment.
- `GET /v1/payment`: List payments.
- `POST /v1/payment/{payment_id}/status`: Update payment status.

## Production Payment Endpoints

- `POST /webhooks/payment-callback`: Payment gateway callback (requires signature verification).
- `GET /payments/reconcile`: Reconciliation summary and mismatch detection.
- `POST /payments/{id}/refunds`: Create refund.
- `GET /payments/{id}/refunds`: Query refund history.
- `GET /ops/channels`: View channel health and active channel.
- `PUT /ops/channels/{channel}/health`: Mark channel as healthy/unhealthy for failover.

## Callback Signature

Configure `PAYMENT_CALLBACK_SECRET` and send headers:

- `X-Callback-Timestamp`
- `X-Callback-Signature` (`hex(hmac_sha256(secret, timestamp + "." + raw_body))`)

## Channel Failover

Configure payment channels with `PAYMENT_CHANNELS` (comma-separated). Refunds and new payments use healthy channels; unhealthy primary channels are automatically bypassed.

Refer to `openapi.yaml` for core schema.
