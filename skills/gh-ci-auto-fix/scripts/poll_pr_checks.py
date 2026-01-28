#!/usr/bin/env python3
import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime

RUN_ID_RE = re.compile(r"/actions/runs/(\d+)")


def run(cmd, cwd):
    result = subprocess.run(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{result.stderr.strip()}")
    return result.stdout


def gh_json(cmd, cwd):
    out = run(cmd, cwd)
    return json.loads(out) if out.strip() else {}


def resolve_pr(repo):
    info = gh_json(["gh", "pr", "view", "--json", "number,url"], repo)
    number = info.get("number")
    url = info.get("url")
    if not number:
        raise RuntimeError("Could not resolve current PR. Provide --pr.")
    return str(number), url


def fetch_checks(pr, repo):
    # Keep fields conservative to avoid gh field drift issues.
    fields = "name,state,bucket,link,detailsUrl,startedAt,completedAt"
    return gh_json(["gh", "pr", "checks", pr, "--json", fields], repo)


def extract_run_id(details_url):
    if not details_url:
        return None
    m = RUN_ID_RE.search(details_url)
    return m.group(1) if m else None


def fetch_run_log(run_id, repo, max_lines):
    log = run(["gh", "run", "view", run_id, "--log"], repo)
    lines = log.splitlines()
    if max_lines and len(lines) > max_lines:
        lines = lines[-max_lines:]
    return "\n".join(lines)


def fetch_run_url(run_id, repo):
    data = gh_json(["gh", "run", "view", run_id, "--json", "url"], repo)
    return data.get("url")


def summarize_checks(checks):
    failures = []
    for chk in checks:
        state = chk.get("state")
        bucket = chk.get("bucket")
        if bucket == "fail" or (state and state.upper() not in {"SUCCESS", "NEUTRAL", "SKIPPED"}):
            failures.append(chk)
    return failures


def render_report(pr, pr_url, failures, logs_by_check):
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%SZ")
    lines = [
        "# CI Failure Report",
        "",
        f"- PR: {pr} ({pr_url or 'unknown'})",
        f"- Generated: {now}",
        "",
    ]
    if not failures:
        lines.append("No failing checks detected.")
        return "\n".join(lines)

    lines.append("## Failing Checks")
    for chk in failures:
        name = chk.get("name")
        link = chk.get("detailsUrl") or chk.get("link") or ""
        lines.append(f"- {name} {f'({link})' if link else ''}")
    lines.append("")

    for chk in failures:
        name = chk.get("name")
        details = chk.get("detailsUrl") or chk.get("link") or ""
        run_url = logs_by_check.get(name, {}).get("run_url")
        log_snippet = logs_by_check.get(name, {}).get("log")
        lines.append(f"## {name}")
        if details:
            lines.append(f"- details: {details}")
        if run_url:
            lines.append(f"- run: {run_url}")
        lines.append("")
        if log_snippet:
            lines.append("```")
            lines.append(log_snippet)
            lines.append("```")
        else:
            lines.append("(No log snippet available.)")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Poll GitHub PR checks and collect failing logs.")
    parser.add_argument("--repo", default=".", help="Repo path (default: .)")
    parser.add_argument("--pr", help="PR number or URL (default: current branch PR)")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval seconds")
    parser.add_argument("--max-tries", type=int, default=1, help="Max polling attempts")
    parser.add_argument("--max-lines", type=int, default=200, help="Max log lines to capture")
    parser.add_argument("--report", default="ci_failure_report.md", help="Report output path")
    parser.add_argument("--no-report", action="store_true", help="Do not write report file")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)
    pr = args.pr
    pr_url = None
    if not pr:
        pr, pr_url = resolve_pr(repo)

    attempt = 0
    last_failures = []
    last_logs = {}

    while attempt < max(args.max_tries, 1):
        attempt += 1
        checks = fetch_checks(pr, repo)
        failures = summarize_checks(checks)
        logs_by_check = {}

        for chk in failures:
            details_url = chk.get("detailsUrl") or chk.get("link")
            run_id = extract_run_id(details_url)
            run_url = None
            log_snippet = None
            if run_id:
                try:
                    run_url = fetch_run_url(run_id, repo)
                    log_snippet = fetch_run_log(run_id, repo, args.max_lines)
                except Exception:
                    log_snippet = None
            logs_by_check[chk.get("name")] = {"run_url": run_url, "log": log_snippet}

        report = render_report(pr, pr_url, failures, logs_by_check)
        if not args.no_report:
            with open(os.path.join(repo, args.report), "w", encoding="utf-8") as f:
                f.write(report)

        print(report)
        last_failures = failures
        last_logs = logs_by_check

        if not failures:
            return 0

        if attempt < args.max_tries:
            time.sleep(args.interval)

    return 1 if last_failures else 0


if __name__ == "__main__":
    sys.exit(main())
