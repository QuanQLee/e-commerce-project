# Shipping Service Minimum Requirements

This document lists the minimal information needed to integrate with the Shipping microservice.

## Base URL

- **HTTP**: `http://<host>:5004`

## Required Headers

- `Content-Type: application/json`

## Core Endpoints

- `GET /shipments`: list shipments
- `GET /shipments/{id}`: get shipment by ID
- `POST /shipments`: create a shipment
- `GET /shipments/{id}/tracking`: shipment tracking snapshot
- `POST /rates/calculate`: calculate fee + SLA + carrier strategy
- `POST /shipments/{id}/exception`: mark exception

## Production Shipping Endpoints

- `POST /shipments/{id}/label`: generate shipping label and tracking number
- `POST /shipments/{id}/tracking/callback`: carrier status callback
- `POST /labels/callback`: label provider callback

## Rate Strategy

Rate strategy returns fee, ETA(days), service level and carrier based on:

- destination region (domestic/international)
- package weight
- express flag

Refer to `openapi.yaml` for existing schema baseline.
