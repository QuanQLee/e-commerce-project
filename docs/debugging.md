# Debugging Guide

This document collects tips for debugging the different services that make up the platform.

## .NET Services

Use the built in hot reload support:

```bash
# Run a service with watch to rebuild on changes
cd services/<ServiceName>
dotnet watch run
```

Attach your IDE debugger to the launched process or use `--launch-profile` if your project defines launch profiles.

Unit tests can also be watched:

```bash
dotnet watch test <path to *.Tests.csproj>
```

## Go Service

The Payment service uses Go. The recommended debugger is [Delve](https://github.com/go-delve/delve):

```bash
cd services/Payment
dlv debug ./cmd/server
```

This starts the server under the debugger and allows setting breakpoints and stepping through code.

## Python Service

Analytics is implemented with FastAPI. You can run it with auto reload enabled and the `debugpy` debugger:

```bash
cd services/Analytics
poetry run uvicorn app.main:app --reload --port 8000 --reload-dir app --workers 1
```

Then attach to port `5678` if `debugpy` is configured in `app/main.py`.

## Frontend

The frontend uses Vite and React. Run it in development mode to get hot module reloading and source maps:

```bash
cd frontend
npm run dev
```

Most editors can attach their JavaScript debugger to the Vite dev server on port `5173`.

## Cart Service

Run the Cart service with hot reload and attached debugger:

```bash
cd services/Cart
./debug-cart.sh
```

## Order Service

Run the Order service in watch mode:

```bash
cd services/Order
./debug-order.sh
```


## Inventory Service

Use the helper script to run with auto reload:
```bash
cd services/Inventory
./debug-inventory.sh
```

## Payment Script

A convenience wrapper exists for quickly starting the Payment service:
```bash
cd services/Payment
./debug-payment.sh
```
