# Auth Service Minimum Requirements

This document lists the minimal information required to integrate with the Auth microservice.

## Base URL
- `http://<host>:7000`

## Required Headers
- `Content-Type: application/x-www-form-urlencoded`

## Example Request
```
POST /connect/token
client_id=sample&client_secret=secret&grant_type=client_credentials&scope=api1
```

Additional test clients are also registered:

```text
client_id=1&client_secret=secret1&grant_type=password&username=user1&password=pass1&scope=api1
client_id=2&client_secret=secret2&grant_type=password&username=user1&password=pass1&scope=api1
```

## Introspection Example
```
POST /connect/introspect
token=<ACCESS_TOKEN>
```

## Success Response
```
{
  "access_token": "<TOKEN>",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Refer to `openapi.yaml` for full schema.

### Environment Variables
- `ConnectionStrings__AuthDb` – PostgreSQL connection string. Each tenant can use a dedicated schema.
