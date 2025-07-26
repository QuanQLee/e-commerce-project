# Docker Image Registry

This project publishes container images for every microservice and the frontend to **GitHub Container Registry (GHCR)**. Images are built automatically whenever the `main` branch is updated.

## Images

Each service folder under `services/` produces an image named:

```
ghcr.io/<owner>/<service>.api:latest
```

Where `<owner>` is your GitHub user or organisation and `<service>` matches the service directory name. Image repositories on GHCR must be lowercase, so the workflow automatically converts the service name to lowercase when tagging (for example `Catalog` becomes `catalog`).

The frontend image is built from the `frontend` directory as:

```
ghcr.io/<owner>/frontend.app:latest
```

## Building and Publishing

The workflow defined in `.github/workflows/docker-images.yml` builds all services and pushes them to GHCR. It runs on every push to `main` and can also be triggered manually from the GitHub Actions tab.

Each microservice has its own Dockerfile under `services/<ServiceName>`. The workflow scans every subfolder for a `Dockerfile` and publishes an image per service. When you add new services simply create a Dockerfile and push the code – the pipeline will automatically build and tag `ghcr.io/<owner>/<service>.api:latest` without editing the workflow.

## Pulling Images Locally

To use the published images on your machine:

```bash
docker login ghcr.io -u <user> -p <token>
docker pull ghcr.io/<owner>/<service>.api:latest
```

The token requires the `read:packages` permission. Once the image is pulled you can run it directly or reference it in `docker-compose.yml` by setting the `REGISTRY` variable:

```bash
REGISTRY=ghcr.io/<owner>/ docker compose up <service>.api
```

This instructs Docker Compose to fetch the image from GHCR instead of building it locally.
