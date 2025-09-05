import sys
from pathlib import Path

# Ensure the service's root is on sys.path so tests can import service packages
sys.path.insert(0, str(Path(__file__).resolve().parent))
