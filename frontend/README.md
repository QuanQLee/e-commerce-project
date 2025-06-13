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
