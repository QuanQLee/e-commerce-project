# Performance Analysis and Capacity Planning

This guide describes how to use the existing monitoring stack for profiling and predicting service load.

## Measuring Latency

Prometheus collects metrics from the gateway and services. Import these metrics into Grafana and create dashboards for latency percentiles:

```promql
histogram_quantile(0.95, rate(notification_send_seconds_bucket[5m]))
```

The above query returns the 95th percentile email send time over the last five minutes. Similar queries can be used for any service exporting a histogram.

Track the P95 and P99 latency of critical endpoints to locate slow components. Combine this with application logs and database slow query logs to pinpoint bottlenecks.

## Capacity Planning

Store historical metrics so they can be compared after load tests. You can run stress tests using `scripts/loadtest.sh` which exercises the gateway for a fixed duration. Compare the results with previous runs to verify improvements.

Export business metrics such as hourly order counts from the Analytics service. When trends indicate approaching capacity limits, scale the affected service or database.

Grafana supports forecast plugins that extrapolate metric trends. Adding such panels helps anticipate resource pressure ahead of time.

An example alert rule for latency is included in `services/prometheusRule.yaml` under `notification.rules`. It triggers when the email send P95 latency exceeds one second for five minutes.

When load tests reveal bottlenecks you can scale services in two ways:

- **Vertical scaling** – increase CPU or memory for individual pods or database instances to handle heavier requests.
- **Horizontal scaling** – run more replicas behind the gateway and spread traffic via the load balancer. Kubernetes Horizontal Pod Autoscalers (HPA) can automatically add or remove pods based on CPU or custom metrics such as QPS.
- **Stateful components** like PostgreSQL or message queues can be read‑replicated or sharded to improve throughput while keeping writes consistent.

Define capacity alarms so that when average CPU usage stays above 70% for more than ten minutes an alert is raised. See the `capacity.rules` section in `services/prometheusRule.yaml` for a Prometheus example.

## Error Tracking

Integrate Sentry or a similar platform to collect unhandled exceptions from both backend and frontend code. These reports, combined with Prometheus alerts, enable quick detection of production issues.

## Optimisation Strategies

To handle high concurrency the services rely on multiple techniques:

- **Caching** – Frequently accessed data such as product lists or popular items can be stored in Redis or in‑memory caches. Set appropriate expirations and update the cache when the underlying records change.
- **Asynchronous processing** – Non‑critical tasks like sending emails or writing audit logs should run in the background using queues or scheduled jobs. This keeps request latency low.
- **Database tuning** – Add indexes to columns used in searches, split large queries or employ pagination to reduce load. Monitor slow query logs and refactor them when needed.
- **APM tools** – Integrate application performance monitoring to identify slow functions and memory issues. Optimise algorithms or choose more efficient data structures when hotspots are discovered.
- **Frontend improvements** – Serve compressed assets, minimise bundle size and use a CDN. Efficient client‑side code reduces the pressure on backend services.

## Runtime Guardrails

The BFF keeps a process-wide upstream HTTP connection pool instead of creating a
new client per request. Tune these values after load tests:

- `BFF_WORKERS`: uvicorn worker processes per container. Start at `2` and prefer
  horizontal replicas for sustained traffic.
- `BFF_HTTP_MAX_CONNECTIONS`: total concurrent upstream sockets per worker.
- `BFF_HTTP_MAX_KEEPALIVE_CONNECTIONS`: reusable idle sockets per worker.
- `BFF_HTTP_CONNECT_TIMEOUT`, `BFF_HTTP_READ_TIMEOUT`, `BFF_HTTP_POOL_TIMEOUT`:
  fail fast when an upstream is slow or the connection pool is saturated.
- `BFF_REDIS_MAX_CONNECTIONS`: Redis session-store connections per worker.

For Catalog, product listing is paginated by default (`pageSize=50`, capped at
`200`) and the service uses EF Core DbContext pooling. Keep
`CATALOG_DB_MAX_POOL_SIZE * catalog replica count` below the database connection
budget, leaving headroom for migrations, observability and admin sessions.
