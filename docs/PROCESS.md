# Microservice Development and Deployment Workflow

This document outlines the recommended steps for building, testing and deploying the microservices in this repository.

## 1. Development

- Each service lives under `services/<ServiceName>` and contains its own source code, configuration, tests and `openapi.yaml` contract.
- Shared database: services use the same PostgreSQL instance but store data in separate schemas.
- Communication between services happens via asynchronous messages (Rebus) or through the gateway. Services should never call each other's databases directly.

## 2. API Contracts

- Contracts are defined using **OpenAPI 3.1** in each service's `openapi.yaml` file.
- A short `Minimum.md` gives just the endpoints and headers required for quick integration.
- The gateway only forwards requests that conform to these contracts, ensuring loose coupling.

## 3. Local Testing

Run unit tests for all services before committing:

```bash
# .NET services
for proj in services/*/*.Tests/*.csproj; do
    dotnet test "$proj" --no-build
done

# Go service
cd services/Payment && go test ./...

# Python service
cd services/Analytics
poetry install
poetry run pytest
cd ../Inventory
poetry install
poetry run pytest
```

Run frontend tests using Jest:

```bash
cd frontend
npm install
npm test
```

Bring up the stack locally with Docker:

```bash
cd services
docker compose up --build
```

Alternatively, you can run all tests inside Docker containers. A helper compose
file defines one-off runners:

```bash
cd services
docker compose -f docker-compose.tests.yml up --build --abort-on-container-exit
```

See [testing.md](testing.md) for details.

## 4. Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push. It now:



## 5. API Gateway

The stack uses [Kong Gateway 3.x](https://docs.konghq.com/gateway/) running from the `services/Gateway` container. Routes are declared in `kong.yml` and share the `/api/v1/` prefix. Kong applies authentication, authorisation and rate limiting while exposing Prometheus metrics. When a new service is added, generate its `openapi.yaml`, update `kong.yml` and let the CI pipeline sync the gateway.

```
client ──▶ gateway ──▶ catalog.api
               └──▶ order.api
               └──▶ payment.api
               └──▶ user.api
```

The gateway keeps the services isolated and enforces contract-based routing.

## 6. Deployment

1. Build and tag Docker images via the CI pipeline
2. Push the images to your container registry
3. Deploy the stack using Docker Compose or a Kubernetes manifest
4. Update the gateway configuration with the new service versions
5. Create a version tag (`vMAJOR.MINOR.PATCH`) so `release.yml` can publish the
   multi-architecture images and generate release notes

This workflow keeps the microservices independent while providing a clear path from development to production.
\nFor monitoring instructions see [monitoring.md](monitoring.md).
