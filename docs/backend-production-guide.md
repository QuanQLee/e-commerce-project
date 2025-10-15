# Backend Production Hardening Guide

This guide summarises the production baseline introduced for the gateway and Auth service and outlines the steps the remaining APIs should follow.

## Kong Gateway
- **Configuration**: services/Gateway/kong.yml now depends on environment variables for CORS origins, rate limits and JWT secrets. Supply values via docker-compose (KONG_CORS_ORIGIN_*, KONG_RATE_LIMIT_MINUTE, KONG_REQUEST_BODY_LIMIT_MB, KONG_FRONTEND_JWT_SECRET, KONG_ADMIN_JWT_SECRET) or Kubernetes (kong-env ConfigMap, kong-secrets Secret).
- **Security headers**: Global plugins remove Server/Via headers, limit request payloads, and restrict CORS to the configured origins.
- **Observability**: Prometheus plugin remains enabled. Point Prometheus at /metrics on the gateway service.
- **Action for other environments**: rotate JWT secrets per environment and pin AllowedCorsOrigins to the hosted frontends.

## Auth Service
- **Configuration binding**: Options are loaded from the Auth section (see appsettings.json). Override with environment variables such as Auth__SampleClientSecret in production.
- **Validation**: Startup fails in non-development environments if default secrets are still in use or the signing certificate is missing (AuthOptions.UsesDefaultSecrets).
- **Health + telemetry**: /healthz exposes liveness, /readyz validates database connectivity. Structured JSON logging and OpenTelemetry exporters are enabled (configure OTEL_EXPORTER_OTLP_ENDPOINT).
- **Container**: The image now exposes port 8080, sets ASPNETCORE_URLS, and runs without root privileges.
- **New packages**: Health checks and OpenTelemetry dependencies are added in Auth.csproj; run dotnet restore before publishing.

### Environment variables
| Purpose | Environment key |
| --- | --- |
| BFF redirect URI | Auth__BffRedirectUri |
| Allowable CORS origins (comma-separated) | Auth__AllowedCorsOrigins__0, Auth__AllowedCorsOrigins__1, ... |
| Client credentials secrets | Auth__SampleClientSecret, Auth__AdminClientSecret, Auth__SecondaryAdminClientSecret |
| Test user password | Auth__DefaultTestUserPassword |
| Signing certificate | Auth__SigningCertificatePath, Auth__SigningCertificatePassword |

## Catalog Service
- **Config validation**: ConnectionStrings:CatalogDb is required; Allowed origins come from Catalog__AllowedCorsOrigins__* (defaults only for dev).
- **Telemetry & health**: /healthz and /readyz expose Postgres readiness; OTEL exporters honour OTEL_EXPORTER_OTLP_ENDPOINT.
- **Container**: Runs on port 8080 as non-root with ASPNETCORE_URLS=http://+:8080.

## Order Service
- **Config validation**: ConnectionStrings:OrderDb and Order__AllowedCorsOrigins__* must be supplied per environment.
- **Metrics**: Custom order counters emit via OpenTelemetry Meter "order-service.metrics"; ensure collectors subscribe to that meter.
- **Quartz/Rebus**: Quartz hosted service remains enabled; move Rebus transport settings to environment when messaging is wired.
- **Container**: Also runs on port 8080, non-root, with JSON console logging and OTEL exporters.

## docker-compose updates
- Gateway now sources sensitive values from environment variables instead of inline strings and applies defaults suitable for local testing.
- Auth, Catalog, and Order run on port 8080 and retain ASPNETCORE_ENVIRONMENT=Development for local docker usage; production deployments must set Production and provide overrides for secrets and connection strings.

## Kubernetes updates
- k8s/kong-deployment.yaml introduces ConfigMap/Secret driven configuration, resource requests/limits, and readiness/liveness probes.
- Update the associated kong-config ConfigMap (not modified here) with the hardened kong.yml to keep manifests in sync.

## Template for other services
1. **Environment validation**: introduce typed options (OptionsBuilder<T>.ValidateOnStart()) to ensure required secrets per service.
2. **Structured logging**: prefer AddJsonConsole (for .NET) or structured log formatters (for Python) and propagate X-Request-Id.
3. **Health checks**: expose /healthz and /readyz endpoints checking external dependencies (DB, cache, message brokers).
4. **OpenTelemetry**: register tracing + metrics exporters (OTEL_EXPORTER_OTLP_ENDPOINT) so traces flow through the gateway.
5. **Container hardening**: use multi-stage builds, run as non-root, expose explicit ports, and add healthchecks.
6. **Secrets management**: remove inline secrets from manifests; prefer ConfigMaps/Secrets for Kubernetes and .env overrides for docker-compose.

Applying this checklist to the remaining .NET APIs (Cart, Shipping, User) is the fastest way to generalise the improvements. Python services should adopt analogous patterns using FastAPI's lifespan hooks, pydantic-settings for env validation, and uvicorn/gunicorn production settings.


