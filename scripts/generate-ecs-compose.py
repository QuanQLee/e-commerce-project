#!/usr/bin/env python3
"""Generate an ECS-friendly compose file without local build instructions."""
from pathlib import Path
import yaml

SRC = Path('services/docker-compose.yml')
DEST = Path('services/docker-compose.ecs.yml')

if not SRC.exists():
    raise SystemExit(f"Source compose file {SRC} not found")

data = yaml.safe_load(SRC.read_text())
services = data.get('services', {})
for service in services.values():
    service.pop('build', None)

DEST.write_text(yaml.safe_dump(data, sort_keys=False))
print(f"Wrote ECS compose to {DEST}")
