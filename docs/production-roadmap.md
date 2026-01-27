# Production Readiness Roadmap

This file tracks the remaining gaps before the platform can be declared production-ready and lists the next concrete actions to address them.

## Status Overview
- ✅ Platform components are containerised with CI pipelines, BFF sessions persist in Redis, and automated smoke checks exist for EC2 deployments.
- ⚠️ Secrets management, database hardening, observability coverage, and incident response procedures still need production-grade implementation.

## Remaining Gaps & Risks
| Area | Gap / Risk | Owner | Target |
|------|------------|-------|--------|
| Secrets management | Partial: EC2 deploy supports Secrets Manager ingestion, but services still consume shared env vars. | Platform | Move all credentials to Secrets Manager/Parameter Store with per-service IAM roles and rotation. |
| Data layer | Compose now exposes per-service credentials, yet the database still runs as a single admin role; backups undocumented. | Data | Provision per-service DB users, enable managed backups (RDS snapshots), follow [database backup guide](database-backup.md). |
| Networking / Security | Redis and other internals lack TLS/network ACL enforcement. | Infra | Move to managed Redis (Elasticache) with TLS & in-transit encryption. |
| Observability | Partial: alert templates exist but collector, dashboards, and routing need completion. | SRE | Follow [observability blueprint](observability.md) and [CloudWatch alerting](alerting-cloudwatch.md) to finish rollout. |
| Incident response | Runbooks, disaster recovery, and rollback rehearsals incomplete. | Ops | Implement guidance in [operations runbook](operations-runbook.md) and schedule quarterly drills. |
| Compliance | Partial: Admin API emits audit events, but retention and broader coverage remain. | App | Implement centralized audit log retention and expand to other admin surfaces. |

## Next Sprint Backlog
1. **Secrets & Redis Hardening**
   - Migrate BFF session store to managed Redis (TLS, auth, subnet restrictions).
   - Wire AWS Secrets Manager into deployment pipeline; remove plaintext secrets from EC2.
2. **Database Isolation & Backups**
   - Create per-service DB users/roles, update connection strings.
   - Configure automated backups (RDS snapshots or pgBackRest) and document restore test.
3. **Observability Foundations**
   - Ship logs to CloudWatch or Loki; set up dashboards for API latency and error rates.
   - Define alert thresholds for gateway 5xx, BFF auth failures, Redis connection errors.
4. **Operational Readiness**
   - Draft incident runbook covering health-check failure rollback workflow.
   - Add DR rehearsal checklist (multi-AZ failover, Redis snapshot restore).

## Tracking
Update this document at the end of each sprint to note completed items, new risks, and planned work.
