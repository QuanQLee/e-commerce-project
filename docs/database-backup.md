# Database Backup & Recovery Guide

This guide explains how to protect the platform's PostgreSQL data in both local and production deployments.

## Local / Developer Environments
- The `services/docker-compose.yml` stack stores Postgres data in the `pgdata` volume. Create ad-hoc snapshots with:
  ```bash
  docker compose exec pg pg_dumpall -U ${DB_USER:-catalog_admin} > backup.sql
  ```
- To restore:
  ```bash
  docker compose exec -T pg psql -U ${DB_USER:-catalog_admin} < backup.sql
  ```
- For smoke testing backups in CI, run `pg_dump` into a temporary artifact and validate schema drift.

## Production Recommendations (AWS reference)
1. **Managed PostgreSQL (Amazon RDS / Aurora)**
   - Enable automated snapshots with a minimum 7-day retention and multi-AZ standby to survive AZ outages.
   - Configure customer-managed KMS encryption, and audit snapshot copy events.
   - Run cross-region snapshot replication for disaster recovery.

2. **Role / Credential Isolation**
   - Create a dedicated database, schema, and IAM database credential (or password) per microservice (`catalog_svc`, `order_svc`, etc.).
   - Grant the minimum privileges (usually CRUD within its schema). Avoid shared `superuser` roles in application connections.
   - Rotate credentials via Secrets Manager and update tasks/deployments automatically.
   - Use `scripts/provision-db-roles.sh` to bootstrap per-service roles/databases from env values before running migrations.

3. **Point-in-Time Recovery (PITR)**
   - With RDS, enable PITR to any second within the retention window. Document the RDS restore workflow and the time required.
   - For self-managed PostgreSQL, configure WAL archiving using `pgBackRest` or `wal-g` to store WAL segments in S3.

4. **Restore Testing**
   - Schedule quarterly drills restoring a snapshot to a staging environment. Validate migrations and service bootstrapping against the restored data.
   - Track Recovery Time Objective (RTO) and Recovery Point Objective (RPO) results; feed them into the risk register.

5. **Automation Hooks**
   - Integrate backup verification into CI/CD. After applying migrations, trigger a lightweight backup and run checksum validation.
   - Use Infrastructure-as-Code (Terraform/CloudFormation) to codify snapshot schedules, retention, and alarms.

## Monitoring & Alerts
- Alert on backup failures, replica lag, storage capacity, and replication health (e.g., RDS event subscriptions + CloudWatch alarms).
- Include backup status in the on-call dashboard alongside application latency/error metrics.

## Checklist
- [ ] Automated backups enabled with documented retention policy.
- [ ] Service accounts scoped per microservice (`*_svc` roles).
- [ ] Secrets stored in AWS Secrets Manager and rotated.
- [ ] Regular restore drills with recorded RTO/RPO.
- [ ] Alerts configured for backup failures and replication lag.
