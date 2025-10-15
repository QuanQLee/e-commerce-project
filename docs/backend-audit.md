# Backend Production Hardening Audit

## API Gateway (Kong)
- services/Gateway/kong.yml exposes every upstream over HTTP with permissive origins: ["*"] and wildcard headers; JWT/ACL secrets are hard-coded (myfrontendsecret, myadminsecret).
- No automated stripping of sensitive headers (X-Forwarded-*, Via), and global rate limiting is local-only (no Redis/DB) so nodes cannot scale horizontally.
- TLS offload is not documented; all upstream URLs are plain HTTP and there is no health check configuration or circuit breaking per route.

## Service Inventory
| Service | Primary Stack | Notes |
| --- | --- | --- |
| Address | Python (FastAPI) | Minimal Dockerfile, no production logging/metrics hooks. |
| Admin | Python | Similar pattern. |
| Analytics | Python | Depends on Postgres via connection string in compose file. |
| Asset | Python | TBD |
| Auth | .NET 8 API | Handles JWT issuance, good candidate for first hardening pass. |
| Bff | Python | Likely aggregates services. |
| Cart | .NET 8 API + Redis | Redis endpoint hard-coded, no TLS/ACL. |
| Catalog | .NET 8 API | Hardened (env validation, OTEL, health/readiness, non-root container). |
| Cms/Consent/Currency/... | Python | Consistent FastAPI style. |
| Gateway | Kong | Needs secure defaults (CORS, secrets, TLS). |
| github | Node.js | Integrates GitHub API; .env contains raw tokens. |
| Inventory/Notification/Promotion/... | Python | Missing structured logging, health/readiness, env validation. |
| Order | .NET 8 API | Hardened (env validation, custom metrics via OTLP, readiness checks). |
| Payment | Go | Uses Postgres, Dockerfile exposes two ports, lacks non-root user. |
| Security | Java (Gradle) | Security service; check OpenAPI + Dockerfile for production toggles. |
| Shipping | .NET 8 API | Pending review. |
| Tax | Python | Pending review. |
| Tenant | Python | Pending review. |
| User | .NET 8 API | Pending review. |
| Wishlist | Python | Pending review. |

_Inventory derived from repository scan; detailed per-service audits will follow._

## Shared Infrastructure
- services/docker-compose.yml runs everything in one network with plaintext secrets, dev ASP.NET settings, exposed host ports, and no resource constraints.
- prometheus.yml/prometheusRule.yaml exist but no service scrape annotations or exporters are wired.
- k8s/ manifests still use placeholder images (latest) and lack ConfigMaps/Secrets separation.

## Initial Hardening Targets
1. **Gateway (Kong)** ¡ª externalize secrets, tighten CORS, add TLS expectations and upstream health checks.
2. **Auth service** ¡ª introduce configuration validation, structured logging, OpenTelemetry, health/readiness endpoints, and secure container defaults.
3. **Shared docker-compose / k8s overlays** ¡ª add production profiles, secret management, resource limits, and observability wiring.

Outputs from these steps will form the template for the remaining APIs.
## Changes Implemented
- Catalog and Order services now enforce connection string/env validation, structured logging, OpenTelemetry export, and expose /healthz + /readyz while running on port 8080 as non-root.
- Kong declarative config now externalises CORS and signing secrets and enforces stricter headers/rate limiting.
- docker-compose and Kubernetes manifests inject gateway secrets through environment variables/secrets instead of inline values.
- Auth service validates configuration on startup, emits structured logs/OpenTelemetry telemetry, exposes /healthz + /readyz, and its container image defaults to non-root on port 8080.



