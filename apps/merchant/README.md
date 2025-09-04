# Merchant Portal

A Vite + React (MUI) admin portal for managing products, orders and coupons.

## Dev Setup

- Install deps: `npm i`
- Env file: create `.env.local` (or `.env`) with:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=your-dev-key
VITE_AUTH_CLIENT_ID=1
VITE_AUTH_CLIENT_SECRET=secret1
VITE_AUTH_SCOPE=api1
```

- Run: `npm run dev`

## Auth Notes

- Login exchanges username/password for an access token at `/api/v1/auth/connect/token` (through the gateway).
- Token is held in-memory and persisted to `sessionStorage` by default; if "Remember me" is checked, it persists to `localStorage`.
- 401 responses clear the token and redirect to `/login`.
- You can add an HttpOnly cookie flow on the backend. The frontend will then rely on the cookie automatically.

## Quality

- Lint: `npm run lint`
- Format: `npm run format`

