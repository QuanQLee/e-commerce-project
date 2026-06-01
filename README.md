# E-Commerce Microservices

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open-source full-stack e-commerce project built for learning and practical reference. It is a complete, usable system that combines backend microservices, a Kong gateway, authentication, BFF aggregation, web frontends, native mobile clients, deployment scripts, observability, and production runbooks.

The project is maintained as a long-term open-source reference rather than a packaged library. Its goal is to help developers study how commerce domains, service boundaries, gateway routing, mobile clients, and production operations fit together in one repository.

## Highlights

- Multi-service commerce backend covering catalog, order, cart, user, shipping, payment, inventory, analytics, auth, tenant, promotion, RMA, and supporting domains.
- Kong gateway with `/api/v1/` routing, CORS, rate limiting, request-size limits, correlation IDs, and Prometheus metrics.
- BFF service for browser and native mobile flows, including session persistence through Redis.
- Native iOS and Android client skeletons wired to the same `Gateway -> Bff -> services` backend flow.
- Docker Compose, EC2/RDS deployment guidance, smoke checks, SLO checks, release acceptance scripts, and monitoring configuration.
- Production-oriented documentation for security, observability, performance, release delivery, and operations.

## Open Source Readiness

- Licensed under the [MIT License](LICENSE).
- Runtime `.env` files are ignored and removed from version control; use the checked-in `.env.example` files as templates.

## Quick Start

```bash
cd services
cp .env.example .env
docker compose up --build
```

The gateway listens on `http://localhost:8000`. The frontend can be started separately with:

```bash
cd frontend
npm install
npm run dev
```

## Architecture

- **Catalog** manages products under `services/Catalog`.
- **Order** handles customer orders under `services/Order`.
- **Cart** manages shopping carts under `services/Cart`.
- **User** manages user accounts under `services/User`.
- **Shipping** handles shipments and rate aggregation under `services/Shipping`.
- **Payment** processes transactions and external gateway logic under `services/Payment`.
- **Consent** manages user privacy consent under `services/Consent`.
- **Inventory** manages stock levels under `services/Inventory` and logs in JSON using structlog.
- **Analytics** collects events, forecasting, and warehouse tasks under `services/Analytics`.
- **Admin** provides backoffice APIs under `services/Admin`.
- **Auth** provides authentication with integrated security and fraud checks under `services/Auth`.
- **Notification** provides email, ticketing, and moderation features under `services/Notification`.
- **Promotion** manages coupons under `services/Promotion`.
- **Review** stores product reviews under `services/Review`.
- **Search** provides search, facets, attributes, and recommendations under `services/Search`.
- **Wishlist** stores user wishlists under `services/Wishlist`.
- **Experiment** provides simple A/B testing under `services/Experiment`.
- **Cms** manages content and SEO under `services/Cms`.
- **Asset** stores media assets under `services/Asset`.
- **RMA** handles returns and refunds under `services/Rma`.
- **Tax** calculates duties and tax under `services/Tax`.
- **Currency** provides exchange rates under `services/Currency`.
- **Address** offers address validation under `services/Address`.
- **Bff** provides frontend aggregation and mobile session flows under `services/Bff`; session data is persisted in Redis for multi-instance resilience.
- **Tenant** manages multi-tenant shops under `services/Tenant`.

## Gateway

All services are exposed through a single Kong Gateway container. Requests share the `/api/v1/` prefix and are routed according to `services/Gateway/kong.yml`. The gateway applies authentication, ACL-based authorization, rate limiting, request-size limits, correlation IDs, and Prometheus metrics.

Stress test endpoints with [`hey`](https://github.com/rakyll/hey), for example:

```bash
hey -z 30s http://localhost:8000/api/v1/catalog/products
```

## Building and Running

From the `services` directory, copy `.env.example` to `.env` and adjust local database credentials before launching. Never commit real credentials; production secrets should live in a vault such as AWS Secrets Manager, Parameter Store, or HashiCorp Vault and be injected at runtime.

If you change the local Postgres credentials later, remove the `pgdata` volume to reinitialize the database:

```bash
cd services
docker compose down -v
docker compose up --build
```

The gateway can also serve HTTPS traffic on `https://localhost:8443`. Provide your own TLS key and certificate under `services/Gateway/certs` so they are mounted into the container. A self-signed pair can be created with:

```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout services/Gateway/certs/gateway.key \
  -out services/Gateway/certs/gateway.crt -subj '/CN=localhost'
```

Run a single service for local testing using its Docker Compose file:

```bash
cd services/<ServiceName>
docker compose up --build
```

Set the `REGISTRY` environment variable to prefix images when you plan to push them to a registry. For example, CI can use `REGISTRY=ghcr.io/<owner>/` so images are pushed to GitHub Container Registry.

### EC2 Deployment

To deploy the full stack onto an EC2 instance or any SSH-accessible host, use the helper script:

```powershell
pwsh ./scripts/deploy-ec2.ps1 -Host <dns-or-ip> -User ubuntu -KeyPath ~/.ssh/prod.pem `
  -Registry 123456789012.dkr.ecr.us-west-1.amazonaws.com/e-commerce -Tag v1.2.3
```

See [docs/deployment-ec2.md](docs/deployment-ec2.md) for the complete workflow, release structure, and rollback guidance.

### Continuous Integration

The `ci.yml` workflow builds images, executes tests, and can publish Docker images after changes merge to the default branch. See [docs/registry.md](docs/registry.md) for image naming and pull guidance.

## Frontend

The `frontend` directory contains a Vite + React application that exposes basic screens for the microservices. It communicates with the backend through the gateway API and demonstrates product browsing and creation, user and order management, shipping, payments, metrics, and authentication.

### Development

```bash
cd frontend
npm install
npm test
npm run dev
```

Set `VITE_API_BASE_URL` in a local `.env` to the gateway URL. Use `http://localhost:8000` for local development.

### Docker

To run the frontend together with the microservices:

```bash
cd services
docker compose up --build frontend
```

The UI will be available at `http://localhost:3000`.

## Mobile Apps

Native mobile clients live under:

- `apps/android-app`
- `apps/ios-app`

Both clients are wired to the same `Gateway -> Bff -> services` backend flow. See [docs/mobile-apps.md](docs/mobile-apps.md), [apps/android-app/README.md](apps/android-app/README.md), and [apps/ios-app/README.md](apps/ios-app/README.md).

## Monitoring

A minimal Prometheus and Grafana setup is included. Start them from the `services` directory:

```bash
cd services
docker compose up prometheus grafana
```

Prometheus scrapes the gateway and Analytics service using `services/prometheus.yml`. Access Grafana on `http://localhost:3001` and add Prometheus at `http://prometheus:9090` as a data source.

## Running Tests in Docker

Use the helper compose file to execute backend and frontend tests inside containers:

```bash
cd services
docker compose -f docker-compose.tests.yml up --build --abort-on-container-failure
```

Each container installs dependencies and runs the suite for its service. See [docs/testing.md](docs/testing.md) for more information.

## Service Documentation

- [Database guidelines](docs/database.md)
- [Monitoring stack](docs/monitoring.md)
- [Service communication and reliability](docs/service-communication.md)
- [Kubernetes deployment guide](docs/kubernetes.md)
- [Platform services overview](docs/platform-services.md)
- [Security best practices](docs/security-best-practices.md)
- [Database backup and recovery](docs/database-backup.md)
- [Observability blueprint](docs/observability.md)
- [Operations runbook](docs/operations-runbook.md)
- [Release and delivery playbook](docs/release-delivery.md)
- [Docker image registry](docs/registry.md)
- [Frontend architecture](docs/frontend-architecture.md)
- [Mobile apps](docs/mobile-apps.md)
- [Production readiness roadmap](docs/production-roadmap.md)
- [Java backend migration](docs/java-backend-migration.md)

## License

This project is licensed under the [MIT License](LICENSE).
