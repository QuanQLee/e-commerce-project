# Security Service

This microservice centralizes authentication, authorization, anti-fraud checks and audit logging. It is built with **Spring Boot 3** using **Spring Security** and optional `spring-shell` commands.

## Minimum Requirements

See [Minimum.md](Minimum.md) for the minimal integration information.

## Development

1. Install Java 17 and Gradle.
2. The Gradle wrapper JAR is not kept in version control. Running `./gradlew` will download it automatically.
3. Build and run:
   ```bash
   ./gradlew bootRun
   ```
4. Build Docker image:
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
