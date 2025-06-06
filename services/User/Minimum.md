# User Service Minimum Requirements

This document provides the minimal information required to integrate with the User microservice.

## Base URL

- **HTTP**: `http://<host>:5003`

## Required Headers

- `Content-Type: application/json`

## Example Endpoints

- `GET /users` – list all users
- `GET /users/{id}` – get user by ID
- `POST /users` – create a new user

### Create User Example

```json
POST /users
{
  "userName": "demo",
  "email": "demo@example.com"
}
```

Refer to `openapi.yaml` for the full schema.
