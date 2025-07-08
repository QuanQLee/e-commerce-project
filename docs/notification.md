# Notification Service

The Notification microservice handles outgoing email messages for the platform.
It is implemented with FastAPI and uses SMTP to deliver emails.

## Features

- `/email` endpoint queues an email for asynchronous delivery
- Prometheus metrics at `/prometheus`
- `notifications_sent_total` counter labelled by status
- `/healthz` for readiness/liveness probes

During development you can run the service standalone:
```bash
cd services/Notification
docker compose up --build
```

Configure the SMTP connection via environment variables described in `services/Notification/README.md`.
