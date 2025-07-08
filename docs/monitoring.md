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

Grafana is available on [http://localhost:3001](http://localhost:3001) with the default password `admin`. Add Prometheus (`http://prometheus:9090`) as a data source and import dashboards as needed.

## Customising

Edit `services/prometheus.yml` to add additional scrape targets for other services if they expose metrics endpoints.

Alerting rules are defined in `services/prometheusRule.yaml`. Prometheus will trigger
notifications when thresholds such as stalled orders or payment failures are exceeded.
