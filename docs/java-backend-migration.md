# Java Backend Migration

Use Java as the primary stack for core transaction services while keeping the
current polyglot services running during migration.

## Target Direction

- Core services: Java 17, Spring Boot 3, PostgreSQL, Redis, MQ, Actuator,
  Prometheus, OpenTelemetry.
- Edge/data services: keep Python or Go when they are clearly better suited
  for BFF, analytics, recommendation, jobs, or gateway-adjacent workloads.
- Migration style: add Java service beside the current implementation, verify
  parity, then switch traffic through Kong/BFF configuration.

## First Pilot: Catalog

`services/CatalogJava` is a Java pilot for the existing Catalog service. It
keeps the same `/products` API path and supports:

- tenant isolation via `X-Tenant-Id`
- bounded pagination with `page` and `pageSize`
- PostgreSQL access through HikariCP
- Flyway schema bootstrap compatible with the existing `catalog.products` table
- health and Prometheus metrics through Spring Actuator

Run the pilot beside the existing services:

```powershell
cd services
$env:COMPOSE_PROFILES = "java-core"
$env:CATALOG_SERVICE_BASE = "http://catalog.java.api:8080"
docker compose up --build catalog.java.api bff.api gateway
```

For local Java-only checks:

```powershell
cd services/CatalogJava
mvn test
```

## Recommended Order

1. Catalog Java pilot
2. User/Auth boundary review
3. Cart Java service with Redis-backed storage
4. Inventory Java service with reservation semantics
5. Order Java service with async stock/payment orchestration
6. Payment boundary hardening and idempotency

Do not migrate every service at once. Cut traffic one service at a time and
keep rollback as a configuration change.
