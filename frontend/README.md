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

### Login Form

The **Login** page now supports both the `client_credentials` and `password` OAuth2 grant types.
Choose the grant type from the dropdown and enter the required fields. When a sample client ID (`1` or `2`) is entered, the form automatically switches to the password grant.
Use the provided test user (`user1`/`pass1`) with these clients.

## Development

```
cd frontend
npm install
npm run dev
```

Create a `.env` file and set `VITE_API_BASE_URL` to the gateway URL (use `http://localhost` for local development).
When the frontend runs inside Docker Compose, point it to `http://gateway:8000` so requests reach the gateway container.
If the gateway has the `key-auth` plugin enabled, also provide `VITE_API_KEY` with your API key so the frontend can authenticate its requests.

### Docker

Build and run the UI in a container for standalone testing:

```bash
docker compose up --build
```

The Dockerfile installs both dependencies and devDependencies so that
TypeScript tooling has access to packages like `@types/node` during the build.

The site will be served on [http://localhost:3000](http://localhost:3000). Adjust `VITE_API_BASE_URL` in `docker-compose.yml` if necessary (e.g. `http://gateway:8000`).

Unknown paths are rewritten to `index.html` via the bundled `nginx.conf`,
allowing browser refreshes on routes like `/add-user` without returning 404.
