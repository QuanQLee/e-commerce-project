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
```

Bring up the stack locally with Docker:

```bash
cd services
docker compose up --build
```

## 4. Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push. It performs the following:

1. Set up .NET 8 and Go
2. Restore dependencies
3. Run the unit tests
4. Build Docker images for each service

You can extend the workflow to push images to a registry or deploy to Kubernetes.

## 5. API Gateway

An API gateway (for example [YARP](https://github.com/microsoft/reverse-proxy)) routes traffic to the individual services. Each service registers its OpenAPI document with the gateway so that the contracts can be validated centrally.

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

This workflow keeps the microservices independent while providing a clear path from development to production.
