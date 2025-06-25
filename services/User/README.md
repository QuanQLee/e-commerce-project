# User Service

This service manages user accounts for the platform. It is implemented in **.NET 8 WebAPI** with **Rebus** for asynchronous messaging and **Quartz.NET** for background jobs.

## Environment Variables
- `ConnectionStrings__UserDb`: PostgreSQL connection string, for example `Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=P@ssw0rd!`.

## Database Schema
Schema name: `user` with single table `users`.

## Development
The project targets .NET 8 and references Rebus and Quartz packages. You can build the Docker image with:

```bash
docker build -t user.api .
```

Then run with Docker Compose:

```bash
docker compose up --build
```

The service automatically creates its database schema on startup using
`EnsureCreated()`. Make sure the configured PostgreSQL instance is reachable
before running the container.

See `Minimum.md` for integration details and `openapi.yaml` for the full API contract.
