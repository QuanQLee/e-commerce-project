# iOS Native App

This app is the iOS native client for the shared `Gateway -> Bff -> services` backend.

## Current scope

- Mobile password login through `POST /auth/mobile/login`
- Token refresh through `POST /auth/mobile/refresh`
- Product list from `GET /api/v1/catalog/products`
- Order list from `GET /api/v1/order/orders`
- Single-product "buy now" order creation through `POST /api/v1/order/orders`

## Project generation

This repo runs on Windows, so the iOS project is checked in as Swift source plus `XcodeGen` config.

On a Mac:

1. Install [XcodeGen](https://github.com/yonaskolb/XcodeGen).
2. Open `D:\ds\apps\ios-app`.
3. Run `xcodegen generate`.
4. Open the generated `EcommerceMobile.xcodeproj`.
5. Run the app in the iOS simulator.

Default Debug API settings:

- Base URL: `http://8.138.198.205:8000`
- Default tenant: `ds`
- Default username: `ds_user`

The password is intentionally not stored in the app. Enter the test password on the login screen.

## Release configuration

- Debug builds use [`Info.Debug.plist`](</D:/ds/apps/ios-app/EcommerceMobile/Info.Debug.plist:1>) and keep local HTTP plus password-login fallback.
- Release builds use [`Info.plist`](</D:/ds/apps/ios-app/EcommerceMobile/Info.plist:1>) and expect a real `https://` API base URL.
- Before shipping, replace `https://api.example.com` in the release plist with the real production gateway hostname.
