# Release & Delivery Playbook

This guide provides a practical baseline for:
- canary/gray release gating
- rollback strategy
- backup restore drills
- automated acceptance

## 1. Pre-release
1. Build images and deploy to staging.
2. Run test suite (`services/docker-compose.tests.yml`).
3. Run acceptance gate:
   - `ENV_FILE=services/.env.production ./scripts/validate-production-env.sh`
   - `./scripts/release-acceptance.sh`
   - Optional performance sanity: `RUN_LOADTEST=true ./scripts/release-acceptance.sh`
4. Build user-facing clients with release-safe settings:
   - `cd apps/merchant && npm run build`
   - Android release builds must set `MOBILE_API_BASE_URL_RELEASE`
   - iOS release builds must replace `APIBaseURL` in `EcommerceMobile/Info.plist`

## 2. Gray/Canary Rollout
1. Deploy new release to a small instance subset.
2. Keep traffic low (e.g., 5%-10%) for canary period.
3. Watch:
   - gateway 5xx ratio
   - payment failures
   - inventory insufficient spikes
   - SLO p95
4. If stable, gradually increase traffic to 100%.

## 3. Rollback
1. Trigger rollback immediately if SLO or error budget is violated.
2. Repoint to previous release using `scripts/deploy-ec2.ps1` rollback flow.
3. Re-run `./scripts/release-acceptance.sh` against rolled-back version.

## 4. Backup/Restore Drill
1. Run `./scripts/backup-restore-drill.sh` on a maintenance window.
2. Validate table listing and basic query in drill database.
3. Record duration and issues in runbook.

## 5. Acceptance Criteria
- Smoke checks pass.
- Production environment validation passes with no placeholder secrets or local URLs.
- SLO checks pass.
- Alerts are clean for at least one canary window.
- Rollback path validated in the same release cycle.
- Gateway OIDC entry returns a redirect.
- Auth OIDC discovery endpoint is reachable.
- Merchant web is reachable and built with production-safe login flags.
