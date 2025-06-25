# E-Commerce Microservices

This repository contains microservices that together form a small e-commerce platform. Services are containerised with Docker and share a single PostgreSQL instance using a schema-per-service model.

## Architecture

- **Services**:
  - **Catalog** – manages products under `services/Catalog`.
  - **Order** – handles customer orders under `services/Order`.
  - **User** – manages user accounts under `services/User`.
  - **Shipping** – coordinates delivery under `services/Shipping`.
  - **Payment** – processes transactions under `services/Payment`.
  - **Analytics** – collects metrics under `services/Analytics`.
  - **Auth** – provides authentication under `services/Auth`.
  - **Security** – offers security features under `services/Security`.

## Gateway

All services are exposed through a single Kong Gateway container. Requests share the `/api/v1/` prefix and are routed according to `services/Gateway/kong.yml`. The gateway applies authentication, ACL-based authorisation, rate limiting and Prometheus metrics. Stress test endpoints with [`hey`](https://github.com/rakyll/hey), for example:

```bash
hey -z 30s http://localhost/api/v1/catalog/products
```


## Building and Running

From the `services` directory you can spin up the entire stack:

```bash
docker compose up --build
```

Run a single service for local testing using its Docker Compose file:

```bash
cd services/<ServiceName>
docker compose up --build
```
When using the Security service, the Gradle wrapper JAR is downloaded
automatically on first run. Simply execute `./gradlew` in `services/Security`.

## Service Documentation


## Frontend

The `frontend` directory contains a Vite + React application that exposes basic screens for each microservice.  It communicates with the backend exclusively through the gateway API and demonstrates product browsing and creation, user and order management, shipping, payments, metrics and authentication.

### Development

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to the gateway URL. When the frontend is
served to your browser it runs outside Docker, so it should access the gateway
through the host at `http://localhost:8000`.

### Docker

To run the frontend together with the microservices:

```bash
cd services
docker compose up --build frontend
```

The UI will be available at `http://localhost:3000`.
The container includes a small nginx configuration so that refreshing browser
routes like `/add-user` loads the SPA's `index.html` rather than returning a 404.

### Standalone Testing

Run only the frontend in a container for quick UI testing:

```bash
cd frontend
docker compose up --build
```

Change `VITE_API_BASE_URL` in `frontend/docker-compose.yml` to match the gateway
address (for example `http://gateway:8000` when both containers are on the same
Docker network).

When the frontend container is run on its own or the gateway is not in the same Docker network, pass the actual gateway address during the build step:

```bash
docker build -t frontend.app:custom 
  --build-arg VITE_API_BASE_URL=http://<host>:8000 
  --build-arg VITE_API_KEY=<your-key> frontend
```

Rebuild the image whenever the gateway address changes.
