#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


TEMPLATE_PATTERN = re.compile(r"\{\{\s*(?P<expr>[^}]+)\s*\}\}")


def strip_wrapping_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def resolve_expr(expr: str) -> str:
    expr = expr.strip()
    default_match = re.match(r'^default\s+(.+?)\s+\(env\s+"([^"]+)"\)\s*$', expr)
    if default_match:
        default_value, env_key = default_match.groups()
        default_value = strip_wrapping_quotes(default_value.strip())
        return os.getenv(env_key, default_value)

    env_match = re.match(r'^env\s+"([^"]+)"\s*$', expr)
    if env_match:
        env_key = env_match.group(1)
        if env_key not in os.environ:
            raise KeyError(f"Missing required environment variable: {env_key}")
        return os.environ[env_key]

    raise ValueError(f"Unsupported template expression: {expr}")


def render_template(raw: str) -> str:
    def replacer(match: re.Match[str]) -> str:
        expr = match.group("expr")
        return resolve_expr(expr)

    return TEMPLATE_PATTERN.sub(replacer, raw)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: render-kong-config.py <input> <output>", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    raw = input_path.read_text(encoding="utf-8")
    rendered = render_template(raw)
    output_path.write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
