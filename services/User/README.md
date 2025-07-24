# User Service

This service manages user accounts for the platform. It is implemented in **.NET 8 WebAPI** with **Rebus** for asynchronous messaging and **Quartz.NET** for background jobs.

## Environment Variables
- `ConnectionStrings__UserDb`: PostgreSQL connection string, for example `Host=pg;Port=5432;Database=catalog;Username=catalog_admin;Password=<your-password>`.

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

### Troubleshooting

If the container fails to start with an error similar to:

```
password authentication failed for user "catalog_admin" (SqlState: 28P01)
```

verify that the username and password in `ConnectionStrings__UserDb` match the
credentials used by the PostgreSQL container. Changing the value of
`DB_PASSWORD` after the database volume has been created will not update the
stored password. Remove the `pgdata` volume or adjust the connection string so
the credentials align.

See `Minimum.md` for integration details and `openapi.yaml` for the full API contract.
