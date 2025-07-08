# Security Service

This microservice centralizes authentication, authorization, anti-fraud checks and audit logging. It is built with **Spring Boot 3** using **Spring Security** and optional `spring-shell` commands.

## Minimum Requirements

See [Minimum.md](Minimum.md) for the minimal integration information.

## Development

1. Install Java 17 and Gradle.
2. Run the service with hot reload:
   ```bash
   ./debug-security.sh
   ```
3. Build Docker image:
   ```bash
   docker build -t security.api .
   ```
5. Or run locally with Docker Compose:
   ```bash
   docker compose up --build
   ```

## Database

Uses PostgreSQL schema `security` in the shared instance. Configure the datasource via environment variables or `application.yml`.

## API Contract

Endpoints cover authentication, order/payment risk checks, rate limiting and audit logging. The REST API is documented in [openapi.yaml](openapi.yaml).

## Audit Logs

The `/audit` endpoint accepts JSON payloads describing user or admin actions. Entries are stored in `logs/audit.log` by the `AuditService` and can be forwarded to a central log stack such as ELK. Login attempts are automatically audited with action codes `login-success`, `login-invalid-otp` and `login-blocked`.

## Metrics

Prometheus metrics are exposed via the Spring Boot Actuator at [`/actuator/prometheus`](http://localhost:8082/actuator/prometheus). These include login counts and other JVM statistics for use in Grafana dashboards.
