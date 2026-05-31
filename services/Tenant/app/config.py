import os

DB_PATH = os.getenv("TENANT_DB_PATH", "/tmp/tenant.db")
SENSITIVE_OPS_TOKEN = os.getenv("TENANT_SENSITIVE_OPS_TOKEN", "tenant-2fa-token")

PLAN_LIMITS: dict[str, tuple[int, int]] = {
    "basic": (1000, 10),
    "pro": (10000, 100),
    "enterprise": (100000, 1000),
}

PLAN_PRICING: dict[str, float] = {
    "basic": 99.0,
    "pro": 299.0,
    "enterprise": 999.0,
}
