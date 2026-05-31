# Catalog Java

Java pilot implementation of the Catalog service. It keeps the existing
`/products` API shape so traffic can be switched from the current .NET Catalog
through the BFF by changing `CATALOG_SERVICE_BASE`.

## Stack

- Java 17
- Spring Boot 3
- Spring Web, Validation, Data JPA
- PostgreSQL with HikariCP
- Flyway migrations
- Actuator and Prometheus metrics

## Local Commands

```powershell
mvn test
mvn spring-boot:run
```

The service defaults to `jdbc:postgresql://pg:5432/catalog`. Override
`CATALOG_JDBC_URL`, `CATALOG_DB_USER`, and `CATALOG_DB_PASSWORD` for local runs.
