# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

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
When using the Security service, the Gradle wrapper JAR is downloaded
automatically on first run. Simply execute `./gradlew` in `services/Security`.

## Service Documentation

