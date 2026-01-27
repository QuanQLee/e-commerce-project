# EC2 Deployment Guide

This document explains how to deploy the platform onto Amazon EC2 instances (or any SSH‑accessible Linux host) using the helper script `scripts/deploy-ec2.ps1`.

## Prerequisites

- Docker Engine and Docker Compose plugin installed on the target host.
- A Linux user with permission to run Docker commands (add to the `docker` group or use `sudo` with passwordless configuration).
- OpenSSH server running on the host.
- A private key that can authenticate as the deployment user.
- Secrets (`.env`, TLS certificates, etc.) pre-provisioned on the host or available locally to upload during deployment.

> **Security tip:** Store production secrets in a managed vault (AWS Secrets Manager, Parameter Store, HashiCorp Vault…). Use the script's `-EnvFile` option only for bootstrap scenarios and delete the file afterwards.

## Script Parameters

```powershell
pwsh ./scripts/deploy-ec2.ps1 `
  -Host ec2-11-22-33-44.compute.amazonaws.com `
  -User ubuntu `
  -KeyPath ~/.ssh/prod.pem `
  -Registry 123456789012.dkr.ecr.us-west-1.amazonaws.com/e-commerce `
  -Tag v1.2.3 `
  -ComposeFile services/docker-compose.yml,services/docker-compose.aws.yml,services/docker-compose.aws.logging.yml `
  -RemotePath /opt/ecommerce `
  -EnvFile C:\secrets\services.env
```

| Parameter      | Description |
|----------------|-------------|
| `Host`         | Public DNS or IP of the EC2 instance. |
| `User`         | SSH user (e.g. `ubuntu`, `ec2-user`). |
| `KeyPath`      | Path to the private SSH key. |
| `Registry`     | Image registry prefix used by the compose file. |
| `Tag`          | Image tag to deploy (`latest` by default). |
| `ComposeFile`  | One or more Compose files to upload (defaults to `services/docker-compose.yml`). |
| `RemotePath`   | Base directory for releases (`/opt/ecommerce`). |
| `EnvFile`      | Optional `.env` file to copy into `shared/.env`. |
| `KeepReleases` | Number of historical releases retained (default `5`). |
| `HealthCheckUrl` | Optional HTTP(S) endpoint to probe after containers start. Skip to disable smoke tests. |
| `HealthCheckTimeoutSeconds` | Max time to wait for the health check to pass (default `60`). |
| `HealthCheckIntervalSeconds` | Delay between health check attempts (default `5`). |
| `AwsRegion`    | AWS region used when fetching secrets. Required if `Secrets` is set. |
| `Secrets`      | One or more AWS Secrets Manager IDs whose contents hydrate the runtime `.env`. |
| `ProvisionDbRoles` | Provision per-service DB roles/databases before deploying (requires `PGPASSWORD` + `psql`). |
| `ProvisionDbRolesMode` | `remote` (default) runs on the EC2 host; `local` runs on the machine invoking the script. |
| `ProvisionDbRolesScript` | Path to the provisioning script (defaults to `scripts/provision-db-roles.sh`). |
| `RunSmokeChecks` | Run `scripts/smoke-checks.sh` after deployment (fails the deploy if checks fail). |
| `SmokeChecksScript` | Path to the smoke check script (defaults to `scripts/smoke-checks.sh`). |
| `DryRun`       | Print commands without executing them. |

## What the Script Does

1. Creates `RemotePath/releases/release-<timestamp>` on the host.
2. Uploads the compose file(s) (and optional `.env`) to the new release directory.
3. Validates the compose file with `docker compose config`.
4. Pulls images and runs `docker compose up -d --remove-orphans`.
5. Updates the `RemotePath/current` symlink to the new release.
6. Keeps the latest `KeepReleases` releases and prunes older ones.

After deployment, `docker compose ps` runs to show container status. If `HealthCheckUrl` is defined, the script polls the endpoint (using `curl`) before promoting the release.

## Health Checks & Rollback

- The helper uses the previous release (tracked through the `current` symlink) as an automatic rollback target. If the health check fails or the compose rollout errors, the script will stop the new stack, restore the old release and repoint the symlink.
- Ensure `curl` is installed on the EC2 instance when health checks are enabled. You can provide an internal URL such as `http://localhost:8000/healthz` so the probe runs from inside the host.
- Because the same Compose project name is reused, host ports are freed before the new containers start. You can override the project name by exporting `COMPOSE_PROJECT_NAME` in the environment.

## Bootstrapping Secrets

The script copies the provided `EnvFile` into `RemotePath/shared/.env`. Each deployment re-uses that file unless a new one is uploaded. Prefer to store secrets in a vault and hydrate them onto the instance with cloud-init, SSM, or a configuration management tool.

### AWS Secrets Manager integration

- If you supply the `Secrets` parameter, the script downloads each secret via `aws secretsmanager get-secret-value` (AWS CLI must be configured on the machine running the script). Specify the region via `AwsRegion`.
- Secrets whose `SecretString` is JSON will be converted into `KEY=VALUE` pairs; plain strings are appended as-is. Example JSON payload:

```json
{
  "DB_PASSWORD": "super-secret",
  "KONG_ADMIN_JWT_SECRET": "rotate-me"
}
```

- You can combine `EnvFile` and `Secrets`; the secret-derived keys are appended to the uploaded `.env`. Remove the `-EnvFile` parameter once all sensitive values are stored in Secrets Manager.

## Database Role Provisioning

- Enable with `-ProvisionDbRoles`. The script loads env keys from `.env` (or `-EnvFile`) and creates per-service roles/databases using `scripts/provision-db-roles.sh`.
- For `remote` mode the EC2 host must have `psql` installed and connectivity to the database. For `local` mode the invoking machine needs `bash` and `psql`.

## CloudWatch Logs (Test Environments)

- Use `services/docker-compose.aws.logging.yml` to enable the `awslogs` driver on core services.
- Set `AWS_REGION`, `AWS_LOG_GROUP`, and `AWS_LOG_STREAM_PREFIX` in your `.env` (see `services/.env.example`).

## Production Baseline (EC2 + RDS + ElastiCache + ALB)

1. Populate a production env file using `services/.env.production.example` as a template (store it securely).
2. Point DB and Redis to managed services (RDS/ElastiCache) and use TLS endpoints (`rediss://`).
3. Deploy using the logging overlay and health check:

```powershell
pwsh ./scripts/deploy-ec2.ps1 `
  -Host <ec2-host> `
  -User ubuntu `
  -KeyPath ~/.ssh/prod.pem `
  -Registry <ecr-registry> `
  -Tag v1.0.0 `
  -ComposeFile services/docker-compose.yml,services/docker-compose.aws.yml,services/docker-compose.aws.logging.yml `
  -EnvFile C:\secrets\services.prod.env `
  -ProvisionDbRoles `
  -ProvisionDbRolesMode remote `
  -HealthCheckUrl http://localhost:8000/status `
  -RunSmokeChecks
```

The ALB target group can use `/status` on the gateway for health checks.

## Health Checks and Rollback

- Verify the gateway (`https://your-domain/healthz`) and the BFF (`http://<host>:9080/healthz`) after deployment.
- To roll back, point the `current` symlink to a previous release and rerun `docker compose up -d`. The releases live under `RemotePath/releases`.

## Automation Ideas

- Trigger the script from CI after a successful build. Store SSH keys and registry credentials in GitHub Actions secrets.
- Pair with AWS Systems Manager Session Manager to eliminate SSH keys.
- Add additional post-deploy steps (database migrations, cache warmups) by editing the Bash script block inside `deploy-ec2.ps1`.
