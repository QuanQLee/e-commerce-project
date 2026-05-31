import os
import sys
import logging
import httpx
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
import structlog
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(message)s")
structlog.configure(processors=[structlog.processors.JSONRenderer()])
logger = structlog.get_logger("admin")

trace.set_tracer_provider(TracerProvider(resource=Resource.create({"service.name": "admin"})))
trace.get_tracer_provider().add_span_processor(SimpleSpanProcessor(ConsoleSpanExporter()))

def _csv_env(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or [default]


ALLOWED_ORIGINS = _csv_env(
    "ADMIN_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3002,http://localhost:4000",
)
AUDIT_LOG_ENABLED = os.getenv("ADMIN_AUDIT_LOG_ENABLED", "true").lower() in {"1", "true", "yes"}

app = FastAPI(title="Admin API", version="v1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()

@app.exception_handler(httpx.HTTPError)
async def httpx_error_handler(_: Request, exc: httpx.HTTPError):
    logger.error("httpx_error", error=str(exc))
    return JSONResponse(status_code=502, content={"error": str(exc)})

def handle_response(resp: httpx.Response):
    if resp.status_code >= 400:
        try:
            data = resp.json()
            detail = data.get("error", resp.text)
        except ValueError:
            detail = resp.text
        raise HTTPException(status_code=resp.status_code, detail={"error": detail})
    return resp.json()

REQUEST_COUNTER = Counter("admin_requests_total", "Admin requests", ["endpoint"])

CATALOG_URL = os.getenv("CATALOG_URL", "http://catalog.api:80")
ORDER_URL = os.getenv("ORDER_URL", "http://order.api:80")
USER_URL = os.getenv("USER_URL", "http://user.api:80")
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://inventory.api:8000")

async def get_client():
    async with httpx.AsyncClient() as client:
        yield client

def verify_admin(request: Request):
    groups = request.headers.get("X-Consumer-Groups", "")
    if "admin-group" not in groups.split(","):
        raise HTTPException(status_code=403, detail="forbidden")


def _parse_claim_values(header_value: str | None) -> set[str]:
    if not header_value:
        return set()
    normalized = header_value.replace(" ", ",")
    return {item.strip() for item in normalized.split(",") if item.strip()}


def verify_permission(request: Request, permission: str) -> None:
    groups = _parse_claim_values(request.headers.get("X-Consumer-Groups"))
    if "admin-group" in groups:
        return

    permission_headers = [
        request.headers.get("X-Consumer-Permissions"),
        request.headers.get("X-Permissions"),
        request.headers.get("X-Consumer-Scopes"),
        request.headers.get("X-Scopes"),
    ]
    permissions = set()
    for value in permission_headers:
        permissions.update(_parse_claim_values(value))

    if permission not in permissions:
        raise HTTPException(status_code=403, detail=f"missing permission: {permission}")


def require_permission(permission: str):
    def _dependency(request: Request) -> None:
        verify_permission(request, permission)

    return _dependency

def _audit_actor(request: Request) -> str:
    return (
        request.headers.get("X-Consumer-Username")
        or request.headers.get("X-Consumer-Id")
        or request.headers.get("X-Forwarded-User")
        or "unknown"
    )

def audit_log(request: Request, action: str, target: str, status: str = "attempt") -> None:
    if not AUDIT_LOG_ENABLED:
        return
    logger.info(
        "admin_audit",
        action=action,
        target=target,
        status=status,
        actor=_audit_actor(request),
        request_id=request.headers.get("X-Request-Id", ""),
        client_ip=request.client.host if request.client else "",
        method=request.method,
        path=request.url.path,
    )

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/products")
async def list_products(
    request: Request,
    client: httpx.AsyncClient = Depends(get_client),
    _: None = Depends(require_permission("catalog.products.read")),
):
    REQUEST_COUNTER.labels("list_products").inc()
    audit_log(request, "list_products", "catalog")
    resp = await client.get(f"{CATALOG_URL}/products")
    data = handle_response(resp)
    audit_log(request, "list_products", "catalog", status="success")
    return data

@app.put("/products/{pid}")
async def update_product(
    pid: str,
    payload: dict,
    request: Request,
    client: httpx.AsyncClient = Depends(get_client),
    _: None = Depends(require_permission("catalog.products.write")),
):
    REQUEST_COUNTER.labels("update_product").inc()
    audit_log(request, "update_product", f"product:{pid}")
    resp = await client.put(f"{CATALOG_URL}/products/{pid}", json=payload)
    data = handle_response(resp)
    audit_log(request, "update_product", f"product:{pid}", status="success")
    return data

class AdjustQty(BaseModel):
    quantity: int

@app.post("/products/{pid}/inventory")
async def adjust_inventory(
    pid: str,
    body: AdjustQty,
    request: Request,
    client: httpx.AsyncClient = Depends(get_client),
    _: None = Depends(require_permission("inventory.adjust.write")),
):
    REQUEST_COUNTER.labels("adjust_inventory").inc()
    audit_log(request, "adjust_inventory", f"product:{pid}")
    resp = await client.post(
        f"{INVENTORY_URL}/inventory/release",
        json={"product_id": pid, "quantity": body.quantity},
    )
    data = handle_response(resp)
    audit_log(request, "adjust_inventory", f"product:{pid}", status="success")
    return data

@app.get("/orders")
async def list_orders(
    request: Request,
    client: httpx.AsyncClient = Depends(get_client),
    _: None = Depends(require_permission("orders.read")),
):
    REQUEST_COUNTER.labels("orders").inc()
    audit_log(request, "list_orders", "order")
    resp = await client.get(f"{ORDER_URL}/orders")
    data = handle_response(resp)
    audit_log(request, "list_orders", "order", status="success")
    return data

@app.get("/users")
async def list_users(
    request: Request,
    client: httpx.AsyncClient = Depends(get_client),
    _: None = Depends(require_permission("users.read")),
):
    REQUEST_COUNTER.labels("users").inc()
    audit_log(request, "list_users", "user")
    resp = await client.get(f"{USER_URL}/users")
    data = handle_response(resp)
    audit_log(request, "list_users", "user", status="success")
    return data

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
