# Auth Service

This service provides authentication via Duende IdentityServer on .NET 8. It now uses a local credential store in PostgreSQL under the `auth.local_users` table instead of `TestUserStore`.

## Client types

The service exposes three production-safe client categories:

| Client ID | Flow | Notes |
| --- | --- | --- |
| `sample` | `client_credentials` | service-to-service sample client |
| `bff-web` | `authorization_code + PKCE` | browser SSO through the BFF |
| `mobile-native` | `authorization_code + PKCE` | native app login through the BFF |

Two legacy password-grant clients (`1` and `2`) still exist for local development, but only when `Auth__EnablePasswordGrantClients=true`.

## Local bootstrap user

The service can seed a local development user when `Auth__EnableBootstrapTestUser=true`.

Default local development values:

- Username: `user1`
- Password: `DevPassw0rd!`

That user is seeded only for local/dev environments and should stay disabled in production.

## Token requests

Client credentials:

```bash
curl -X POST http://localhost:7000/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=sample&client_secret=sample-secret-dev&grant_type=client_credentials&scope=api1"
```

Development-only password grant:

```bash
curl -X POST http://localhost:7000/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=1&client_secret=admin-secret-dev&grant_type=password&username=user1&password=DevPassw0rd!&scope=api1 offline_access"
```

## Environment variables

- `ConnectionStrings__AuthDb`: PostgreSQL connection string.
- `Auth__EnablePasswordGrantClients`: local-only fallback for password grant clients.
- `Auth__EnableSelfRegistration`: toggles `/account/register`.
- `Auth__EnableBootstrapTestUser`: seeds the bootstrap development user.
- `Auth__SigningCertificatePath`: required outside development.
- `Auth__SigningCertificatePassword`: certificate password when using a protected PFX.

## Startup guarantees

Outside development, startup now fails when:

- default secrets are still configured
- password-grant clients are left enabled
- bootstrap test user seeding is left enabled
- no signing certificate is configured

## Development

1. Install .NET 8 SDK.
2. Run the service:
   ```bash
   dotnet run --project Auth.csproj
   ```
3. Or run using the local Docker Compose file:
   ```bash
   docker compose up --build
   ```

## Multi-tenant notes

Authentication is shared. Tenant-specific user records live in the User service and are synchronized by the BFF after login/registration.
