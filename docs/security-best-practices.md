# Network Security and Boundary Protection

This document collects recommendations for hardening the platform when running in production.

## Restrict Network Exposure

- Only expose the Kong gateway on the public network. Forward ports `80` and `443` to the gateway and keep all other services private.
- Databases, message queues and internal APIs should not be reachable from the Internet. Run them behind the cluster network or a private subnet.
- Configure firewall rules or cloud security groups so that only the gateway can accept external traffic. Allow internal communication between pods or containers as required.

## Kubernetes Network Policies

Use [NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/) resources to control pod traffic. The file `k8s/network-policy.yaml` shows an example that restricts PostgreSQL access to in-cluster clients only.

## Web Application Firewall

Protect the gateway with a WAF to block common attacks such as SQL injection and XSS. When using a cloud provider enable its WAF product. For self‑hosted environments add the `modsecurity` module to the Nginx gateway container or deploy a dedicated WAF sidecar.

## Frontend Security

- Enforce a strict Content Security Policy (CSP) to mitigate XSS.
- Escape user input on the server and client sides.
- For cookie‑based sessions implement a CSRF token. JWT APIs generally do not need CSRF protection but cross‑origin requests should be limited with CORS rules.

## Logging, Metrics and Alerts

Every service writes structured logs and exposes Prometheus metrics. Extend `services/prometheusRule.yaml` with alert rules for latency, error rates and unusual traffic patterns. Review [monitoring.md](monitoring.md) for setup instructions.

## Testing and Debugging

Maintain unit and contract tests for each service. The helper Compose file `services/docker-compose.tests.yml` runs all suites in containers. Debug scripts are documented in [debugging.md](debugging.md).
