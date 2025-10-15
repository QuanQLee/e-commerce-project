# Frontend Production Checklist

This document captures the runtime and build considerations for the three customer-facing frontends.

## Shared
- Copy the relevant `.env.example` file (per app) and set values for your deployed environments.
- Set `VITE_RUNTIME_ENV_STRICT=true` (or `RUNTIME_ENV_STRICT=true` for the Next.js app) in CI/CD so builds fail fast if required variables are missing.
- Serve all apps behind HTTPS. Using `http://` will trigger warnings in the runtime configuration helpers.

## Storefront (`apps/storefront`, Next.js)
- Required at build time: `NEXT_PUBLIC_API_BASE_URL`.
- Optional: `NEXT_PUBLIC_API_KEY`.
- Security headers (CSP, HSTS, Permissions-Policy) are emitted by `next.config.js`.
- Static assets (`/_next/static` and images) are long-lived cached (immutable) by the framework configuration.

## Merchant portal (`apps/merchant`, Vite)
- Key env vars: `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_SSO_ENABLED`, `VITE_RUNTIME_ENV_STRICT`.
- Docker build arguments map directly to `ENV` so CI can inject secure values.
- The shipped `nginx.conf` enables gzip, caching, CSP and other baseline security headers.

## Admin console (`frontend`)
- Same env vars as the merchant portal; set `VITE_SSO_ENABLED=1` to show the SSO button on the login page.
- Route-level code splitting keeps the initial bundle light; keep future routes inside `routeConfig` in `src/App.tsx`.
- The multi-stage Dockerfile emits only the optimized Vite `dist` assets and reuses the hardened `nginx.conf`.

## Verification
- `npm run build` succeeds for all three apps using local fallbacks.
- Add a CI job that builds each app with `*_RUNTIME_ENV_STRICT=true` set to ensure production variables exist before shipping.
