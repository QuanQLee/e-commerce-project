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

Run the gateway with the rest of the stack via `docker compose up` from the `services` directory.
