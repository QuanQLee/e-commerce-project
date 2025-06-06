# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

- **Gateway** – incoming requests are routed through an Nginx based gateway under `services/Gateway`.
  - Available at `http://localhost:8080` when using the compose setup.
- **PostgreSQL** – one database is used, but each service stores data in its own schema.
- **Services**:
  - **Catalog** – manages products. Implemented under `services/Catalog`.
  - **Order** – handles customer orders under `services/Order`.
  - **Payment** – processes payments using Go and gRPC Gateway under `services/Payment`.
  - **Security** – central authentication, risk checks and audit logging under `services/Security`.

## Building and Running

From the `services` directory you can spin up the existing stack:

```bash
docker compose up --build
```

This starts PostgreSQL and the `catalog.api` container. The compose file will evolve as more services (such as `Order` and `Payment`) are added.

You can build and run a service individually as well:

```bash
cd services/Catalog
# build
docker build -t catalog.api .
# run
docker run -p 5000:80 catalog.api
```
When using the Security service, the Gradle wrapper JAR is downloaded
automatically on first run. Simply execute `./gradlew` in `services/Security`.

## Service Documentation

Each service keeps its own README describing API contracts and configuration. See `services/<service>/README.md` for details specific to a service. A short `Minimum.md` file in each service provides just the essential integration info (base URLs, required headers, example request).
OpenAPI specifications (for example `services/Catalog/openapi.yaml`) can be used to generate API documentation or validate service contracts.

## CI/CD

GitHub Actions builds and tests all services on every push. See `.github/workflows/ci.yml` for details.
