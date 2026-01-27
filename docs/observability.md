# Observability Blueprint

This document outlines how to deliver production-grade visibility for the platform across metrics, logs, traces and alerting.

## Goals
- Centralised, queryable view of application and infrastructure logs.
- Distributed tracing to follow transactions across services (gateway → BFF → microservices).
- Dashboards for latency, error rates, resource usage, business KPIs.
- Automated alerts that page on-call responders when SLOs are threatened.

## Metrics
- **Current**: Prometheus scrapes gateway, BFF, analytics, inventory, notification, promotion, review, recommendation, admin services (`services/prometheus.yml`).
- **Next steps**:
  1. Add scrape targets for remaining services (Auth, Payment, etc.) including custom business metrics.
  2. Export metrics from managed services (RDS, ElastiCache) via CloudWatch and federate into Prometheus or import CloudWatch dashboards.
  3. Define Service Level Objectives (SLOs) for key flows (checkout, login, catalog browse) and derive alert rules from error budget consumption.

## Logging
- Centralise container logs using a collector (Fluent Bit, Vector, or CloudWatch Logs agent). Route to:
  - **AWS**: CloudWatch Logs → Subscription filter → OpenSearch/Datadog/Splunk.
  - **Self-hosted**: Loki + Grafana stack.
- Adopt a structured logging format (JSON with `trace_id`, `span_id`, `request_id`, `user_id`, `service`).
- Redact PII before shipping logs; enforce retention policies (e.g., 14 days for app logs, 90 days for audit).

### EC2 test setup
- For quick AWS testing on EC2, use `services/docker-compose.aws.logging.yml` with the `awslogs` driver.
- Populate `AWS_REGION`, `AWS_LOG_GROUP`, `AWS_LOG_STREAM_PREFIX` in `.env` (see `services/.env.example`).

### Action items
1. Ship BFF / backend `stdout` to Fluent Bit sidecar → CloudWatch Logs group per service.
2. Configure log-based metrics for `5xx` counts, auth failures, and business errors.
3. Add correlation IDs in gateway responses and propagate via BFF to downstream services.

## Tracing
- Adopt OpenTelemetry SDKs in .NET, Python, Go services; use Jaeger or AWS X-Ray as collector.
- Inject trace headers in Kong to propagate to BFF / services.
- Instrument critical flows: login, add-to-cart, checkout, payment capture.
- Use trace data to debug latency and verify retry/circuit-breaker behaviour.

### Action items
1. Deploy OpenTelemetry Collector (sidecar or standalone) with exporters to Jaeger / CloudWatch.
2. Update service code to emit spans (FastAPI, ASP.NET, Go).
3. Build trace-based alerts (e.g., >20% of checkout traces exceed 2 seconds).
4. Set `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_SERVICE_NAME` for services to enable tracing.

## Alerting & On-call
- Define alert policies covering:
  - Gateway/BFF request failure rates, P95 latency.
  - Redis/RDS connectivity, replication lag, CPU/memory saturation.
  - Job queues (if applicable), payment declines, order anomalies.
- Integrate alert manager (Prometheus Alertmanager, PagerDuty, Opsgenie) for routing & escalation.
- Create dashboards for on-call (Grafana + CloudWatch) with bookmarks for key playbooks.

### Action items
1. Map service owners to alerts and document escalation rotation.
2. Configure Alertmanager routes (Slack for warnings, PagerDuty for critical).
3. Run alert simulations and verify runbook steps.

### CloudWatch baseline (RDS + ElastiCache)
- **RDS**: `CPUUtilization`, `DatabaseConnections`, `FreeStorageSpace`, `FreeableMemory`, `ReadLatency`, `WriteLatency`.
- **ElastiCache (Redis)**: `CPUUtilization`, `CurrConnections`, `FreeableMemory`, `Evictions`, `ReplicationLag`.
- Create critical alarms on sustained high CPU, memory pressure, connection spikes, and replication lag.

## Implementation Checklist
- [ ] Central log collector deployed; logs searchable by service/trace ID.
- [ ] OpenTelemetry instrumentation emitting traces in staging.
- [ ] Grafana dashboards for gateway/BFF, database, cache, business KPIs.
- [ ] Alertmanager routes configured with acknowledged owners.
- [ ] On-call playbook updated with dashboard URLs and alert definitions.

## Health Endpoints
- Gateway health: `/status` (routed to BFF `/healthz`).
- BFF health: `/healthz`, readiness: `/readyz` (checks Redis).
- Inventory readiness: `/readyz` (checks database connectivity).
- Analytics readiness: `/readyz` (checks database connectivity).
- Cart readiness: `/readyz` (checks Redis connectivity).
- Payment readiness: `/readyz` (checks database connectivity).
- User readiness: `/readyz` (checks database connectivity).
- Shipping readiness: `/readyz` (checks database connectivity when configured).

Keep this blueprint updated as observability tooling evolves and new services are added.
