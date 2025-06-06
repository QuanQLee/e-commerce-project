# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

- **Gateway** – incoming requests are routed through an API gateway (not yet in this repo). Services run behind the gateway.
- **PostgreSQL** – one database is used, but each service stores data in its own schema.
- **Services**:
  - **Catalog** – manages products. Implemented in this repository under `services/Catalog`.
  - **Order** – planned service for handling customer orders.

## Building and Running

From the `services` directory you can spin up the existing stack:

```bash
docker compose up --build
```

This starts PostgreSQL and the `catalog.api` container. The compose file will evolve as more services (such as `Order`) are added.

You can build and run a service individually as well:

```bash
cd services/Catalog
# build
docker build -t catalog.api .
# run
docker run -p 5000:80 catalog.api
```

## Service Documentation

Each service keeps its own README describing API contracts and configuration. See `services/<service>/README.md` for details specific to a service.
