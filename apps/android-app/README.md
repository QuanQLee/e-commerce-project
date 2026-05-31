# Android Native App

This app is the Android native client for the shared `Gateway -> Bff -> services` backend.

## Current scope

- Mobile password login through `POST /auth/mobile/login`
- Token refresh through `POST /auth/mobile/refresh`
- Product list from `GET /api/v1/catalog/products`
- Order list from `GET /api/v1/order/orders`
- Single-product "buy now" order creation through `POST /api/v1/order/orders`

## Local development

1. Start the backend stack from `D:\ds\services`.
2. Make sure the BFF allows mobile password login in local development.
3. Open this folder in Android Studio.
4. Let the Gradle wrapper sync.
5. Run on an Android emulator.

Default local API settings:

- Base URL: `http://10.0.2.2:8000/`
- Default tenant: `tenant-a`
- Default username: `user1`

Sample local credentials used elsewhere in this repo:

- Username: `user1`
- Password: `DevPassw0rd!`

Those credentials only exist when the local bootstrap auth user is enabled in [`services/Auth/appsettings.json`](</D:/ds/services/Auth/appsettings.json:12>) or the equivalent env vars.

If you run on a physical Android device, replace `10.0.2.2` with your workstation LAN IP in [`app/build.gradle`](</D:/ds/apps/android-app/app/build.gradle:1>).

## Release configuration

- Release builds require `MOBILE_API_BASE_URL_RELEASE` (or `-PmobileApiBaseUrlRelease`) and reject non-HTTPS or placeholder values.
- Release builds default to `DEFAULT_TENANT_ID=public` and an empty username instead of shipping the local demo username.
- Main manifest defaults to `allowBackup=false` and `usesCleartextTraffic=false`; debug-only overrides reopen those settings for local development.
