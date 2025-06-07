# Auth Service

This service provides authentication via Duende IdentityServer on .NET 8. It stores configuration in PostgreSQL using a dedicated `auth` schema.

## 环境变量
- `ConnectionStrings__AuthDb`: PostgreSQL connection string, e.g. `Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=P@ssw0rd!`.
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
3. Or run with Docker Compose from the `services` folder:
   ```bash
   docker compose up auth.api
   ```

## Multi-tenant Notes
Each tenant should have its own schema in PostgreSQL. Only token issuance and validation are handled here; user roles are stored in the User Service.
