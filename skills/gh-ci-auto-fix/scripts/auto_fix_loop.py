#!/usr/bin/env python3
import argparse
import os
import subprocess
import sys


def run(cmd, cwd, shell=False, check=True, input_text=None):
    result = subprocess.run(
        cmd,
        cwd=cwd,
        shell=shell,
        text=True,
        input=input_text,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}\n{result.stderr.strip()}")
    return result


def confirm(prompt):
    try:
        answer = input(prompt).strip().lower()
    except EOFError:
        return False
    return answer in {"y", "yes"}


def poll(repo, pr, branch, interval, max_tries, max_lines, report):
    script_path = os.path.join(os.path.dirname(__file__), "poll_pr_checks.py")
    cmd = [
        sys.executable,
        script_path,
        "--repo",
        repo,
        "--interval",
        str(interval),
        "--max-tries",
        str(max_tries),
        "--max-lines",
        str(max_lines),
        "--report",
        report,
    ]
    if pr:
        cmd.extend(["--pr", pr])
    if branch:
        cmd.extend(["--branch", branch])
    result = run(cmd, cwd=repo, check=False)
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    return result.returncode


def main():
    parser = argparse.ArgumentParser(description="Auto-fix failing CI by polling, asking consent, fixing, and pushing.")
    parser.add_argument("--repo", default=".", help="Repo path (default: .)")
    parser.add_argument("--pr", help="PR number or URL (default: current branch PR)")
    parser.add_argument("--branch", help="Branch name to inspect workflow runs (non-PR mode)")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval seconds")
    parser.add_argument("--max-tries", type=int, default=5, help="Max polling attempts per check")
    parser.add_argument("--max-lines", type=int, default=200, help="Max log lines to capture")
    parser.add_argument("--report", default="ci_failure_report.md", help="Report output path")
    parser.add_argument("--fix-cmd", action="append", default=[], help="Fix command to run (repeatable)")
    parser.add_argument("--retries", type=int, default=3, help="Max fix/push attempts")
    parser.add_argument("--commit-message", default="fix(ci): auto remediation", help="Commit message")
    args = parser.parse_args()

    repo = os.path.abspath(args.repo)
    if not args.fix_cmd:
        print("No --fix-cmd provided. Add at least one fix command.", file=sys.stderr)
        return 2

    gh_token = os.environ.get("GH_TOKEN")
    if gh_token:
        status = run(["gh", "auth", "status", "-h", "github.com"], cwd=repo, check=False)
        if status.returncode != 0:
            run(
                ["gh", "auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--with-token"],
                cwd=repo,
                check=True,
                shell=False,
                input_text=gh_token + "\n",
            )
            run(["gh", "auth", "setup-git"], cwd=repo, check=False)

    attempt = 0
    while attempt < args.retries:
        attempt += 1
        code = poll(repo, args.pr, args.branch, args.interval, args.max_tries, args.max_lines, args.report)
        if code == 0:
            print("No failing checks detected.")
            return 0

        if not confirm("Failures detected. Apply fixes and push? [y/N] "):
            print("Aborted by user.")
            return 1

        for cmd in args.fix_cmd:
            run(cmd, cwd=repo, shell=True, check=False)

        status = run(["git", "status", "--porcelain"], cwd=repo, check=True).stdout.strip()
        if not status:
            print("No changes after fixes. Re-checking...")
            continue

        run(["git", "add", "-A"], cwd=repo, check=True)
        run(["git", "commit", "-m", args.commit_message], cwd=repo, check=False)
        run(["git", "push"], cwd=repo, check=True)

    print("Max retries reached with remaining failures.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
