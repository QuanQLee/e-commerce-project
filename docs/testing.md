# Running Tests in Docker

You can execute all service and frontend tests inside containers. A separate Compose file defines one-off test runners for each stack.

From the `services` directory run:

```bash
cd services
docker compose -f docker-compose.tests.yml up --build --abort-on-container-exit
```

This spins up containers that install dependencies and run the test suites:

- **analytics.tests** – runs `poetry install` and `pytest`
- **auth.tests** – executes `dotnet test`
- **payment.tests** – runs Go unit tests
- **frontend.tests** – installs Node modules and runs Jest

Containers exit after finishing. Review their logs for results.
