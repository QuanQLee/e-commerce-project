# Operations Runbook & Testing Plan

This document captures the playbooks and validation steps required to support the platform in production.

## 1. Deployment & Rollback
1. **Blue/green via EC2 helper**
   - Use `scripts/deploy-ec2.ps1` with health checks enabled (e.g., `-HealthCheckUrl http://localhost:8000/healthz`).
   - Script automatically keeps the previous release in `RemotePath/releases`. On failure it re-links `current` to the prior release.
2. **Manual rollback checklist**
   - SSH to the host (`ssh -i key.pem user@host`).
   - `ls -1d /opt/ecommerce/releases/release-*` to locate last known-good release.
   - `cd /opt/ecommerce/releases/<timestamp>` → `docker compose up -d --remove-orphans`.
   - `ln -sfn /opt/ecommerce/releases/<timestamp> /opt/ecommerce/current`.
   - Run smoke tests (healthz, login, checkout).
3. **Config change rollback**
   - All secrets should live in AWS Secrets Manager. Revert to previous secret version or redeploy with the last known-good secret ARN/version.
4. **Post-deploy smoke checks**
   - Run `./scripts/smoke-checks.sh` on the host (or via SSH) to verify `/status`, `/healthz`, and `/readyz` endpoints.

## 2. Incident Response Workflow
1. **Triage**
   - PagerDuty/Opsgenie alert should include Grafana/CloudWatch dashboard links.
   - Confirm scope via Prometheus (latency/error rate) and logs (CloudWatch/Loki).
2. **Mitigation**
   - Apply runbook steps (restart service, shift traffic, rollback).
   - Notify stakeholders (Slack #incident, status page).
3. **Post-incident**
   - Open retrospective doc within 24 hours.
   - Capture timeline, root cause, follow-up actions (update runbook, add alerts/tests).

## 3. Disaster Recovery (DR)
1. **Database**
   - Restore snapshot (RDS console or CLI) to staging VPC.
   - Run migrations (if required) and smoke tests.
   - Record RTO/RPO metrics and compare with targets.
2. **Redis**
   - Restore from ElastiCache snapshot or rebuild cluster + seed session defaults.
   - Verify BFF reconnects automatically; validate login/session flows.
3. **Regional failover**
   - Maintain infrastructure-as-code for secondary region.
   - Test DNS failover (Route53) and ensure image repositories/secrets are replicated.

## 4. Testing Strategy
- **Automated**: unit, integration, contract tests run in CI (`services/docker-compose.tests.yml`).
- **Performance**: quarterly load tests using k6/Locust against staging; monitor error rate/latency.
- **Chaos/Resilience**: simulate Redis or database outage (e.g., AWS Fault Injection Simulator).
- **Security**: run dependency scanning (Dependabot/GitHub Advanced Security) and static analysis; schedule penetration tests annually.

## 4.1 Alerting Baseline
- Use `docs/alerting-cloudwatch.md` and `scripts/create-cloudwatch-alarms.sh` to create initial RDS/ElastiCache alarms.
- Validate paging routes by triggering a test alarm and confirming delivery.

## 5. Communication Templates
- **Incident notification (Slack / Status page)**
  ```
  🚨 Incident <ID>: Brief description
  Impact: e.g., Checkout failures for 20% of users
  ETA: Investigating / Mitigating
  Next update: <time>
  ```
- **Incident resolved**
  ```
  ✅ Incident <ID> resolved at <time>.
  Root cause: <summary>
  Follow-up: <link to postmortem>.
  ```

## 6. Checklist
- [ ] Deployment health check scripted and validated.
- [ ] On-call rotation documented; contact information up to date.
- [ ] DR drill executed within last quarter (database + Redis + failover).
- [ ] Runbooks stored centrally and reviewed each release.
- [ ] Alert catalogue reviewed quarterly with SLO updates.

Keep this runbook updated after every incident or significant change.
