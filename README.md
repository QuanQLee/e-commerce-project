# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

- **Gateway** – incoming requests are routed through an API gateway. Each service exposes an OpenAPI contract and the gateway forwards requests accordingly.
- **PostgreSQL** – one database instance; every service stores data in its own schema.
- **Services**:
  - **Catalog** – manages products under `services/Catalog`.
  - **Order** – handles customer orders under `services/Order`.

## Building and Running

From the `services` directory you can spin up the entire stack:

```bash
docker compose up --build
```

Run a service individually with Docker:

```bash
cd services/Catalog
docker build -t catalog.api .
docker run -p 5000:80 catalog.api
```

## Service Documentation

Each service keeps a README describing API contracts and configuration. See `services/<service>/README.md` for details. A short `Minimum.md` in each service provides just the base URL and required headers. OpenAPI specifications (e.g. `openapi.yaml`) allow contracts to be validated and aggregated by the gateway.

## Continuous Integration

A GitHub Actions workflow in `.github/workflows/ci.yml` restores dependencies, runs all unit tests and builds Docker images for the services on every push.

## Deployment Workflow

Development and deployment steps are documented in `docs/PROCESS.md`. The document covers local testing, CI tasks, how the gateway routes requests and how to deploy the stack with Docker or Kubernetes.
