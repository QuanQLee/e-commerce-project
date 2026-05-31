# Auth Service Minimum Requirements

This document lists the minimum information required to integrate with the Auth service safely.

## Base URL

- `http://<host>:7000`

## Required headers

- `Content-Type: application/x-www-form-urlencoded`

## Supported production flow

Use OAuth 2.0 authorization code + PKCE for browser and native clients:

- browser client: `bff-web`
- native client: `mobile-native`

Client credentials remain available for service-to-service calls:

```text
POST /connect/token
client_id=sample&client_secret=<sample-client-secret>&grant_type=client_credentials&scope=api1
```

## Development-only flow

Password grant clients are available only when `Auth__EnablePasswordGrantClients=true`:

```text
client_id=1&client_secret=<admin-client-secret>&grant_type=password&username=user1&password=DevPassw0rd!&scope=api1 offline_access
client_id=2&client_secret=<secondary-admin-client-secret>&grant_type=password&username=user1&password=DevPassw0rd!&scope=api1 offline_access
```

## Introspection example

```text
POST /connect/introspect
token=<ACCESS_TOKEN>
```

## Success response

```json
{
  "access_token": "<TOKEN>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Refer to `openapi.yaml` for full schema.

## Required production configuration

- `ConnectionStrings__AuthDb`
- `Auth__SampleClientSecret`
- `Auth__AdminClientSecret`
- `Auth__SecondaryAdminClientSecret`
- `Auth__SigningCertificatePath`
- `Auth__SigningCertificatePassword`
