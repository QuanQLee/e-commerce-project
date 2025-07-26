# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

- **Services**:
  - **Catalog** – manages products under `services/Catalog`.
  - **Order** – handles customer orders under `services/Order`.
  - **Cart** – manages shopping carts under `services/Cart`.
  - **User** – manages user accounts under `services/User`.
  - **Shipping** – coordinates delivery under `services/Shipping`.
  - **Payment** – processes transactions under `services/Payment`.
  - **PaymentGateway** – routes third-party payments under `services/PaymentGateway`.
  - **FraudDetection** – detects suspicious orders under `services/FraudDetection`.
  - **Consent** – manages user privacy consent under `services/Consent`.
  - **Inventory** – manages stock levels under `services/Inventory` and logs in JSON using structlog.
  - **Analytics** – collects events and metrics under `services/Analytics`.
  - **Admin** – backoffice APIs under `services/Admin`.
  - **Auth** – provides authentication under `services/Auth`.
  - **Security** – offers security features under `services/Security`.
  - **Notification** – sends email alerts under `services/Notification`.
  - **Promotion** – manages coupons under `services/Promotion`.
  - **Review** – stores product reviews under `services/Review`.
  - **Recommendation** – suggests related products under `services/Recommendation`.
  - **Wishlist** – stores user wishlists under `services/Wishlist`.
  - **Experiment** – simple A/B testing under `services/Experiment`.
  - **Cms** – manages articles and pages under `services/Cms`.
  - **Search** – product search APIs under `services/Search`.
  - **Facet** – attribute-based filtering under `services/Facet`.
  - **Attribute** – manages product attributes under `services/Attribute`.
  - **Asset** – stores media assets under `services/Asset`.
  - **Seo** – generates sitemaps under `services/Seo`.
  - **RMA** – handles returns and refunds under `services/Rma`.
  - **Tax** – calculates duties and tax under `services/Tax`.
  - **Currency** – provides exchange rates under `services/Currency`.
  - **Address** – offers address validation under `services/Address`.
  - **ShippingRate** – aggregates shipping quotes under `services/ShippingRate`.
  - **Bff** – aggregates APIs for each frontend under `services/Bff`.
  - **Performance** – handles SSR and caching under `services/Performance`.
  - **Tenant** – manages multi-tenant shops under `services/Tenant`.
  - **DataWarehouse** – offline analytics under `services/DataWarehouse`.
  - **Forecasting** – predicts sales under `services/Forecasting`.
  - **Ticketing** – customer support tickets under `services/Ticketing`.
  - **Moderation** – reviews user content under `services/Moderation`.

## Gateway

All services are exposed through a single Kong Gateway container. Requests share the `/api/v1/` prefix and are routed according to `services/Gateway/kong.yml`. The gateway applies authentication, ACL-based authorisation, rate limiting and Prometheus metrics. Stress test endpoints with [`hey`](https://github.com/rakyll/hey), for example:

```bash
hey -z 30s http://localhost/api/v1/catalog/products
```


## Building and Running

From the `services` directory you can spin up the entire stack. Copy `.env.example` **into that folder** as `.env` and adjust the values to set database credentials before launching. If you change the credentials later, remove the `pgdata` volume to reinitialise the database:

```bash
docker compose down -v
docker compose up --build
```

The gateway also serves HTTPS traffic on `https://localhost:8443`. Provide your
own TLS key and certificate under `services/Gateway/certs` so they are automatically
mounted into the container. A self-signed pair can be created with:
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout services/Gateway/certs/gateway.key \
  -out services/Gateway/certs/gateway.crt -subj '/CN=localhost'
```

Run a single service for local testing using its Docker Compose file:

```bash
cd services/<ServiceName>
docker compose up --build
```
Set the `REGISTRY` environment variable to prefix images when you plan to push
them to a registry. For example the CI pipeline uses
`REGISTRY=ghcr.io/<owner>/` so images are pushed to GitHub Container Registry.
When using the Security service, the Gradle wrapper JAR is downloaded
automatically on first run. Simply execute `./gradlew` in `services/Security`.

### Automated Docker Builds

Every push to the `main` branch triggers the
`docker-images.yml` workflow which builds a container image for each service and
the frontend, then publishes them to GitHub Container Registry. The workflow
automatically scans the `services` directory so newly added microservices are
picked up without modification.
See [docs/registry.md](docs/registry.md) for details on the image names and how to
pull them locally. This allows you to run the stack using remote images instead
of building them on your machine.

## Service Documentation

- [Database guidelines](docs/database.md)
- [Monitoring stack](docs/monitoring.md)
- [Service communication and reliability](docs/service-communication.md)
- [Kubernetes deployment guide](docs/kubernetes.md)
- [Platform services overview](docs/platform-services.md)
- [Security best practices](docs/security-best-practices.md)
- [Docker image registry](docs/registry.md)
- [Frontend architecture](docs/frontend-architecture.md)

## Frontend

The `frontend` directory contains a Vite + React application that exposes basic screens for each microservice.  It communicates with the backend exclusively through the gateway API and demonstrates product browsing and creation, user and order management, shipping, payments, metrics and authentication.

### Development

```bash
cd frontend
npm install
npm test
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to the gateway URL. Use `http://localhost` for
local development. When the site is served to your host browser from Docker
Compose, the gateway is still reached through `localhost:8000` rather than the
`gateway` container name.

### Docker

To run the frontend together with the microservices:

```bash
cd services
docker compose up --build frontend
```

The UI will be available at `http://localhost:3000`.

### Standalone Testing

Run only the frontend in a container for quick UI testing:

```bash
cd frontend
docker compose up --build
```

Change `VITE_API_BASE_URL` in `frontend/docker-compose.yml` if your gateway runs
on a different host. Use the host address such as `http://localhost:8000` when
you access the UI from your browser. The `gateway` hostname is only resolvable
from within the Docker network.

When the frontend container is run on its own or the gateway is not in the same Docker network, pass the actual gateway address during the build step:

```bash
docker build -t frontend.app:custom 
  --build-arg VITE_API_BASE_URL=http://<host>:8000 
  --build-arg VITE_API_KEY=<your-key> frontend
```

Rebuild the image whenever the gateway address changes.

## Monitoring

A minimal Prometheus and Grafana setup is included. Start them from the `services` directory:

```bash
cd services
docker compose up prometheus grafana
```

Prometheus scrapes the gateway and Analytics service using `services/prometheus.yml`. Access Grafana on <http://localhost:3001> (password `admin`) and add Prometheus (`http://prometheus:9090`) as a data source.

## Running Tests in Docker

Use the helper compose file to execute all backend and frontend tests inside containers:

```bash
cd services
docker compose -f docker-compose.tests.yml up --build --abort-on-container-exit
```

Each container installs dependencies and runs the suite for its service. See [docs/testing.md](docs/testing.md) for more information.

Database conventions and indexing tips are documented in [docs/database.md](docs/database.md).

