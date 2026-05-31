# Merchant Portal

A Vite + React (MUI) admin portal for managing products, orders and coupons.

## Dev Setup

- Install deps: `npm i`
- Env file: create `.env.local` (or `.env`) with:

```
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=your-dev-key
VITE_SSO_ENABLED=1
VITE_PASSWORD_LOGIN_ENABLED=1
VITE_SELF_REGISTRATION_ENABLED=1
```

- Run: `npm run dev`

## Auth Notes

- The production path is `Gateway -> BFF -> Auth` with OIDC SSO at `/auth/oidc/login`.
- Development can optionally keep the local username/password form via `VITE_PASSWORD_LOGIN_ENABLED=1`.
- Self-registration is also behind an explicit flag via `VITE_SELF_REGISTRATION_ENABLED=1`.
- For production merchant access, prefer `VITE_SSO_ENABLED=1`, `VITE_PASSWORD_LOGIN_ENABLED=0`, `VITE_SELF_REGISTRATION_ENABLED=0`.

## Quality

- Lint: `npm run lint`
- Format: `npm run format`
