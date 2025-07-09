# Monitoring

This project exposes Prometheus metrics from both the gateway and the Analytics service. You can run a small monitoring stack locally using the provided Docker Compose configuration.

## Start Prometheus and Grafana

From the `services` directory run:

```bash
cd services
docker compose up prometheus grafana
```

Prometheus will scrape metrics from:

- `gateway:8001/metrics`
- `analytics.api:8000/prometheus`
- `notification.api:8000/prometheus`
- `promotion.api:8000/prometheus`
- `review.api:8000/prometheus`
- `recommendation.api:8000/prometheus`
- `inventory.api:8000/metrics`

Grafana is available on [http://localhost:3001](http://localhost:3001) with the default password `admin`. Add Prometheus (`http://prometheus:9090`) as a data source and import dashboards as needed.

## Customising

Edit `services/prometheus.yml` to add additional scrape targets for other services if they expose metrics endpoints.

Alerting rules are defined in `services/prometheusRule.yaml`. Prometheus will trigger
notifications when thresholds such as stalled orders or payment failures are exceeded.

## Logging

Each service writes structured logs to stdout. When running in Docker these can be collected by your container runtime or forwarded to a log aggregation stack such as the ELK stack or Loki. Log messages should include request identifiers so traces can be correlated across services.

The Inventory service tracks reservation failures via the `inventory_insufficient_total` counter.

## Alert Rules

Prometheus loads alert definitions from `services/prometheusRule.yaml`. Extend this file to watch for error rates, latency spikes or abnormal traffic in any service. Alertmanager forwards notifications to email or chat channels when a rule triggers.

For latency analysis and capacity planning tips see [performance.md](performance.md).
