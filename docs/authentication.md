# Authentication and Authorization

## Legacy API Key Flow

The first iterations of this project secured requests with Kong's `key-auth` plugin. The `Security` service also exposes a `/auth/login` endpoint that simply returns a static token (`demo-token`). For reference the original flow is kept below:

1. Start the gateway:
   ```bash
   docker compose up --build gateway
   ```
2. Create a consumer:
   ```bash
   curl -X POST http://localhost:8001/consumers -d username=frontend
   ```
3. Generate the API key and place it in `VITE_API_KEY` for the frontend.

While convenient for local demos, this approach is not safe for production.

## 1. Single Sign-On with JWT

The repository already contains an **Auth** service based on Duende IdentityServer. Replace the static key flow with a full OAuth2 login:

1. Users post credentials to `Auth` at `/api/v1/auth/connect/token`.
2. The service validates the username and password and issues a JWT access token and refresh token.
3. The frontend stores the tokens and includes the access token in the `Authorization: Bearer <token>` header.
4. Configure the Kong gateway with the `jwt` or `openid-connect` plugin. The plugin verifies the signature using the Auth service's public key and rejects expired or malformed tokens.
   The plugin can point to the Auth service's JWKS endpoint so that signing keys
   rotate automatically.
5. Remove the `key-auth` plugin from `kong.yml` and delete the `demo-token` login endpoint in `Security`.

The Auth service should pull user records from the **User** service database. Extend the user table to include password hashes and roles. Use a strong hashing algorithm such as **BCrypt** or **scrypt**. Alternatively, point IdentityServer's user store directly at the User database. For production deployments consider a managed identity provider such as **Keycloak** or **Auth0** to reduce maintenance overhead.

## 2. Role Based Access Control (RBAC)

Implement RBAC so that each issued JWT contains a `roles` claim. Example roles are `user`, `admin` and `support`. Microservices enforce authorisation based on these claims:

- .NET services: annotate controllers with `Authorize` and define policies.
- Java/Spring services: use Spring Security role checks.
- Kong can filter using ACLs or by inspecting JWT claims.

Maintain the role‑permission mappings inside the Auth or Security service and expose an API for other services to query. The frontend should hide or display UI elements according to the current user's roles.

## 3. OAuth2 / OpenID Connect Providers

The Auth service can also act as an OAuth client for third‑party providers such as **GitHub** or **WeChat**. Upon successful external login, map the returned account to a local user and issue a JWT. When supporting multiple identity providers, implement checks to merge or link accounts safely to avoid conflicts.

## Logging and Metrics

All services should produce structured logs and export Prometheus metrics. The gateway already exposes `/metrics` via the `prometheus` plugin. Mirror this pattern in other services so that Prometheus scrapes them. Refer to [monitoring.md](monitoring.md) for details.

## Testing and Debugging

Run unit and contract tests regularly. A helper compose file runs all suites:

```bash
cd services
# requires Docker
docker compose -f docker-compose.tests.yml up --build --abort-on-container-exit
```

Language‑specific debugging scripts are documented in [debugging.md](debugging.md).

## Alerts

Define Prometheus alert rules for error rates, latency and other critical metrics. Alertmanager should forward notifications to your preferred channel (e.g. email or Slack) when thresholds are exceeded.

