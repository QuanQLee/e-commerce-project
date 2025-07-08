# Auth Service

This service provides authentication via Duende IdentityServer on .NET 8. It stores configuration in PostgreSQL using a dedicated `auth` schema.

## Sample Clients

Three in-memory clients are available for quick testing:

| Client ID | Secret  |
|-----------|---------|
| `sample`  | `secret`|
| `1`       | `secret1`|
| `2`       | `secret2`|

Token requests are sent to `/connect/token`:

```bash
curl -X POST http://localhost:7000/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=sample&client_secret=secret&grant_type=client_credentials&scope=api1"
```

Clients `1` and `2` also support the password grant using the test user `user1`/`pass1`:

```bash
curl -X POST http://localhost:7000/connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=1&client_secret=secret1&grant_type=password&username=user1&password=pass1&scope=api1"
```

## 环境变量
- `ConnectionStrings__AuthDb`: PostgreSQL connection string, e.g. `Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=<your-password>`.
- `PORT`: Optional HTTP port for the service (default `80`).

## Database Schema
The default schema is `auth` and will contain IdentityServer tables for persisted grants and configuration.

## dotnet-idsvr CLI
The project can be generated or updated using the `dotnet-idsvr` CLI tool.

## Development
1. Install .NET 8 SDK and `dotnet-idsvr`.
2. Run the service:
   ```bash
   dotnet run --project Auth.csproj
   ```
3. Or run using the local Docker Compose file:
   ```bash
   docker compose up --build
   ```

## Multi-tenant Notes
Each tenant should have its own schema in PostgreSQL. Only token issuance and validation are handled here; user roles are stored in the User Service.
