# Frontend

This React + Vite application provides a very small portal for both customers and merchants.  It talks to the microservices through the gateway API.

## Available Pages

- Product listing and creation
- Order listing and creation
- User listing and creation
- Shipment listing and creation
- Payment submission
- Analytics metrics view
- Authentication and basic risk check

## Development

```
cd frontend
npm install
npm run dev
```

Create a `.env` file and set `VITE_API_BASE_URL` to the URL of the gateway (e.g. `http://localhost`).
If the gateway has the `key-auth` plugin enabled, also provide `VITE_API_KEY` with your API key so the frontend can authenticate its requests.

### Docker

Build and run the UI in a container for standalone testing:

```bash
docker compose up --build
```

The Dockerfile installs both dependencies and devDependencies so that
TypeScript tooling has access to packages like `@types/node` during the build.

The site will be served on [http://localhost:3000](http://localhost:3000). Adjust `VITE_API_BASE_URL` in `docker-compose.yml` if necessary.
