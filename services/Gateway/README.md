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
setup from this folder.

## Local development (HTTP only)
For local development we default to HTTP on port **8000** to avoid managing
TLS certificates:
```bash
cd ../ && docker compose up -d gateway
```
Open `http://localhost:8000` from your browser or API client.

## Enabling HTTPS locally (optional)
If you want HTTPS on **8443**, provide a certificate and key in `certs/` and
configure the compose file to mount them and expose 8443. You can generate a
self‑signed certificate with:
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout certs/gateway.key \
  -out certs/gateway.crt -subj '/CN=localhost'
```
Then add these to the `gateway` service in `services/docker-compose.yml`:
```yaml
    ports:
      - "8443:8443"
    environment:
      KONG_SSL_CERT: /certs/gateway.crt
      KONG_SSL_CERT_KEY: /certs/gateway.key
    volumes:
      - ./Gateway/certs:/certs:ro
```
Restart the gateway afterwards.
