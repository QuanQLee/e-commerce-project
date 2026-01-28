---
name: gh-ci-auto-fix
description: Poll GitHub Actions PR checks, capture failing logs into a local report, then apply fixes in the current repo (including workflow edits), commit, push to the current branch, and re-poll until green. Use when a user wants automatic CI/CD failure detection + remediation for a GitHub Actions PR in the current repository.
---

# Gh Ci Auto Fix

## Overview

Continuously poll PR checks with `gh`, save a local failure report, apply fixes in the repo (code or workflow), push to the current branch, and re-check until passing or retries are exhausted.

## Workflow

### 1) Preconditions

- Ensure `gh` is authenticated with `repo` and `workflow` scopes. See `references/gh-auth.md`.
- Work from the target repo (default `.`).
- Confirm the intended PR (number or URL) or use the current branch PR.

### 2) Poll and collect failures

Use the bundled script to poll checks and write a report:

```bash
python3 "<path-to-skill>/scripts/poll_pr_checks.py" --repo . --pr "<pr-number-or-url>" --interval 30 --max-tries 20 --report ci_failure_report.md
```

- If `--pr` is omitted, the script uses the current branch PR.
- The report is written to `ci_failure_report.md` by default.
- A non-zero exit code means failures remain after polling.

### 2b) Auto-fix loop (with consent)

Run the auto loop to poll, ask for consent, apply fixes, commit, push, and re-check:

```bash
python3 "<path-to-skill>/scripts/auto_fix_loop.py" --repo . --branch master --fix-cmd "pnpm lint --fix" --fix-cmd "pnpm format" --retries 3
```

- `--fix-cmd` is required and repeatable.
- The script prompts before applying fixes and pushing.

### 3) Apply fixes locally

- Read the failure report and locate the failing job/log snippet.
- Modify code and/or `.github/workflows/*` to address the failure.
- Prefer the smallest change that resolves the failure.
- If fixes are risky or ambiguous, ask for clarification before large refactors.

### 4) Commit and push

Push directly to the current branch:

```bash
git status -sb
git add -A
git commit -m "fix(ci): address failing checks"
git push
```

### 5) Re-poll and retry

Re-run the polling script after pushing. Repeat the fix loop until checks pass or the retry limit is reached.

## Scripts

- `scripts/poll_pr_checks.py`: Poll PR checks, fetch failing GitHub Actions logs, write a local report, and exit non-zero if failures remain.
- `scripts/auto_fix_loop.py`: Poll, prompt for consent, run fix commands, commit, push, and re-check.

## References

- `references/gh-auth.md`: `gh` authentication and scope requirements.
