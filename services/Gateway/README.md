# Gateway

This service packages [Kong Gateway 3.x](https://docs.konghq.com/gateway/) to expose all microservices through a single entry point.
The declarative configuration is defined in `kong.yml` and loaded on startup.

## Routes
Each microservice is available under the `/api/v1/` prefix, for example:

- `/api/v1/catalog` → Catalog service
- `/api/v1/order` → Order service
- `/api/v1/payment` → Payment service
- `/api/v1/user` → User service
- `/api/v1/shipping` → Shipping service
- `/api/v1/auth` → Auth service
- `/api/v1/security` → Security service
- `/api/v1/analytics` → Analytics service

Global plugins enable JWT authentication, ACL based authorisation, rate limiting and Prometheus metrics. New services are added by updating `kong.yml` and reloading Kong (handled by the CI pipeline).

You can run the full stack from the `services` directory, or start a small test
setup from this folder. Provide a TLS certificate and key in `certs/` which will
be mounted into the container. HTTPS is exposed on port **8443**:
```bash
docker compose up --build
```

Ensure environment variables such as `DB_PASSWORD` are set (see `.env.example`). The gateway will serve HTTPS traffic on `https://localhost:8443`.
If you do not have certificates yet, you can generate a self-signed pair using:
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout certs/gateway.key \
  -out certs/gateway.crt -subj '/CN=localhost'
```
