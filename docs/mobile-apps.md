# Mobile Apps

This repository now includes native mobile client skeletons for the shared backend stack:

- [Android app](/D:/ds/apps/android-app)
- [iOS app](/D:/ds/apps/ios-app)

Both clients use the same backend entrypoint:

`App -> Gateway (localhost:8000) -> Bff -> microservices`

## Supported mobile flow

Current native-app MVP covers:

- `POST /auth/mobile/authorize`
- `POST /auth/mobile/exchange`
- `POST /auth/mobile/login`
- `POST /auth/mobile/refresh`
- `GET /api/v1/catalog/products`
- `GET /api/v1/order/orders`
- `POST /api/v1/order/orders`

The BFF returns token payloads for native clients and the apps store:

- `access_token`
- `refresh_token`
- `oauth_client_id`
- `tenant_id`
- `user.id`
- `user.auth_subject_id`

That is enough for the current login, product sync, order sync, and single-item buy-now flow.

For mobile clients, order sync and order creation are current-user scoped at the BFF boundary. Native apps no longer send `userId`; the BFF resolves the current user from the mobile token/session and injects it before proxying to `Order`.

The downstream `Order` service now also enforces current-user scoping through `X-User-Id`, so user isolation does not depend only on client behavior or query/body parameters.

## Local base URLs

Use the gateway public entrypoint instead of calling individual containers directly.

- Android emulator: `http://10.0.2.2:8000`
- iOS simulator: `http://localhost:8000`
- Physical devices: use the workstation LAN IP instead of `10.0.2.2` or `localhost`

## Development auth mode

Production mobile auth should use the native OIDC/PKCE flow:

- `POST /auth/mobile/authorize`
- `POST /auth/mobile/exchange`
- redirect back to `dsmobile://auth/callback`

Local development keeps a password-grant fallback:

- `POST /auth/mobile/login`
- `POST /auth/mobile/refresh`

For local development, `BFF_ALLOW_PASSWORD_GRANT` must be enabled. Release mobile builds should keep browser sign-in as the primary path and leave password login disabled.

If you also keep the bootstrap auth user enabled locally, the default seeded credentials are `user1 / DevPassw0rd!`.

- [`services/docker-compose.yml`](</D:/ds/services/docker-compose.yml:304>) already defaults this to `true`
- [`services/.env.example`](</D:/ds/services/.env.example:51>) now mirrors that local-development expectation
- [`services/.env.production.example`](</D:/ds/services/.env.production.example:31>) keeps it `false`

That split is intentional:

- local native-app MVP can log in immediately
- production uses a dedicated native OIDC/PKCE flow instead of leaving password grant on forever

## Project notes

### Android

The Android client is a Gradle + Jetpack Compose project under [apps/android-app](/D:/ds/apps/android-app).

Key implementation points:

- shared gateway base URL via `BuildConfig.API_BASE_URL`
- bearer token and tenant header added automatically to commerce requests
- browser sign-in callback handled through `dsmobile://auth/callback`
- local session and PKCE state persisted with encrypted shared preferences
- automatic refresh retry on `401`
- release builds disable password-grant fallback by default
- release builds require `MOBILE_API_BASE_URL_RELEASE` (or `-PmobileApiBaseUrlRelease`) and reject placeholder or non-HTTPS values
- main manifest defaults to `allowBackup=false` and `usesCleartextTraffic=false`; debug overrides reopen them for local development

### iOS

The iOS client is checked in as SwiftUI source plus `XcodeGen` config under [apps/ios-app](/D:/ds/apps/ios-app).

Key implementation points:

- shared gateway base URL via `AppConfig`
- bearer token and tenant header added in a single `URLSession` client
- browser sign-in callback handled through `dsmobile://auth/callback`
- local session and PKCE state persisted in Keychain
- automatic refresh retry on `401`
- release builds disable password-grant fallback by default
- debug and release use separate Info.plist files; release expects a real `https://` `APIBaseURL`

## Validation status

- BFF mobile auth tests pass: `poetry run pytest tests/test_sessions.py`
- Android project structure and wrapper can be checked from Windows, but a full Android build still requires Android SDK / Android Studio
- iOS sources were scaffolded, but Xcode validation requires a macOS host

For a backend-only mobile smoke check without running either native app, use:

```powershell
.\scripts\mobile-smoke.ps1
```

To also exercise order creation:

```powershell
.\scripts\mobile-smoke.ps1 -CreateOrder
```

Make sure Docker Desktop is already running before you execute the smoke script, otherwise `localhost:8000` will not be available.
