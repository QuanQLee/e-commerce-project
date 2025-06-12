# Shipping Service

This microservice manages shipment information for orders. It is implemented with **.NET 8 WebAPI** and uses **MassTransit** for messaging and **Hangfire** for background jobs.

## Minimum Requirements

- **Database**: PostgreSQL schema `shipping`.
- **Environment Variable** `ConnectionStrings__ShippingDb` containing the PostgreSQL connection string.
- **Port**: `5004` for HTTP.

## Development

1. Install .NET 8 SDK.
2. Restore dependencies and run:
   ```bash
   dotnet run --urls=http://0.0.0.0:80
   ```
3. Docker build:
   ```bash
   docker build -t shipping.api .
   ```
4. Run with Docker Compose:
   ```bash
   docker compose up --build
   ```

Recurring jobs are configured via Hangfire. The sample job `CheckPendingShipmentsJob` runs every minute.

When a new shipment is created an event `ShipmentCreated` is published via MassTransit.

The OpenAPI contract is defined in `openapi.yaml`.
