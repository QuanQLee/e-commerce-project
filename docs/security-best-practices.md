# Network Security and Boundary Protection

This document collects recommendations for hardening the platform when running in production.

## Restrict Network Exposure

- Only expose the Kong gateway on the public network. Forward ports `80` and `443` to the gateway and keep all other services private.
- Databases, message queues and internal APIs should not be reachable from the Internet. Run them behind the cluster network or a private subnet.
- Configure firewall rules or cloud security groups so that only the gateway can accept external traffic. Allow internal communication between pods or containers as required.

## Secret Management

- Never commit real credentials to the repository. Use the provided `*.env.example` templates and create per-environment `.env` files that stay outside version control.
- Store production secrets (database passwords, JWT keys, API tokens) in a managed vault such as AWS Secrets Manager, Parameter Store, HashiCorp Vault or Azure Key Vault. Grant services access via instance profiles or workload identities instead of embedding keys in images.
- Rotate secrets regularly. At a minimum, refresh JWT signing keys every 90 days and database credentials every 180 days. Automate rotation pipelines where possible.
- Adopt envelope encryption for the most sensitive data. For AWS deployments, enable KMS CMKs and audit every decrypt call.
- Keep an incident playbook describing how to revoke compromised secrets and redeploy services with new credentials.
- Use the deployment helper’s `Secrets` parameter to hydrate `.env` files from Secrets Manager and eliminate plaintext credentials on EC2 hosts.

## Kubernetes Network Policies

Use [NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/) resources to control pod traffic. The file `k8s/network-policy.yaml` shows an example that restricts PostgreSQL access to in-cluster clients only.

## Web Application Firewall

Protect the gateway with a WAF to block common attacks such as SQL injection and XSS. When using a cloud provider enable its WAF product. For self‑hosted environments add the `modsecurity` module to the Nginx gateway container or deploy a dedicated WAF sidecar.

## Frontend Security

- Enforce a strict Content Security Policy (CSP) to mitigate XSS.
- Escape user input on the server and client sides.
- For cookie‑based sessions implement a CSRF token. JWT APIs generally do not need CSRF protection but cross‑origin requests should be limited with CORS rules.

## Authentication Hardening

- Prefer the OAuth 2.0 authorization-code + PKCE flow end-to-end. The BFF only enables the resource owner password grant when `BFF_ALLOW_PASSWORD_GRANT=true`; keep that flag off outside of local development.
- Rotate Kong JWT credentials such as `KONG_FRONTEND_JWT_SECRET` and `KONG_ADMIN_JWT_SECRET` regularly. Secrets must come from a managed vault rather than configuration files baked into images.
- Set per-environment JWT expirations (`maximum_expiration`) and disallow token transmission via query parameters to limit token leakage through logs and analytics.
- Back the BFF session store with a managed Redis cluster that enforces TLS and network ACLs. Do not rely on the in-memory fallback for production traffic.

## Sensitive Operation Verification
- Tenant management sensitive operations should require secondary verification (2FA-like token or step-up challenge):
  - bill payment
  - quota strategy changes
  - member removal
- In this repo baseline, Tenant service enforces a `second_verify_token` on those operations and validates against `TENANT_SENSITIVE_OPS_TOKEN`.

## Data Masking
- Default API responses that expose personal identifiers should support masked output.
- Tenant org APIs now support masked output for invitation/member listing to hide email details and invitation tokens in read paths.

## Logging, Metrics and Alerts

Every service writes structured logs and exposes Prometheus metrics. Extend `services/prometheusRule.yaml` with alert rules for latency, error rates and unusual traffic patterns. Review [monitoring.md](monitoring.md) for setup instructions.

## Testing and Debugging

Maintain unit and contract tests for each service. The helper Compose file `services/docker-compose.tests.yml` runs all suites in containers. Debug scripts are documented in [debugging.md](debugging.md).
