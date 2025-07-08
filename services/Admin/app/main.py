import os
import sys
import logging
import httpx
from fastapi import FastAPI, HTTPException, Depends
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

app = FastAPI(title="Admin API", version="v1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()

REQUEST_COUNTER = Counter("admin_requests_total", "Admin requests", ["endpoint"])

CATALOG_URL = os.getenv("CATALOG_URL", "http://catalog.api:80")
ORDER_URL = os.getenv("ORDER_URL", "http://order.api:80")
USER_URL = os.getenv("USER_URL", "http://user.api:80")
INVENTORY_URL = os.getenv("INVENTORY_URL", "http://inventory.api:8000")

async def get_client():
    async with httpx.AsyncClient() as client:
        yield client

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/products")
async def list_products(client: httpx.AsyncClient = Depends(get_client)):
    REQUEST_COUNTER.labels("list_products").inc()
    resp = await client.get(f"{CATALOG_URL}/products")
    resp.raise_for_status()
    return resp.json()

@app.put("/products/{pid}")
async def update_product(pid: str, payload: dict, client: httpx.AsyncClient = Depends(get_client)):
    REQUEST_COUNTER.labels("update_product").inc()
    resp = await client.put(f"{CATALOG_URL}/products/{pid}", json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()

class AdjustQty(BaseModel):
    quantity: int

@app.post("/products/{pid}/inventory")
async def adjust_inventory(pid: str, body: AdjustQty, client: httpx.AsyncClient = Depends(get_client)):
    REQUEST_COUNTER.labels("adjust_inventory").inc()
    resp = await client.post(
        f"{INVENTORY_URL}/inventory/release",
        json={"product_id": pid, "quantity": body.quantity},
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()

@app.get("/orders")
async def list_orders(client: httpx.AsyncClient = Depends(get_client)):
    REQUEST_COUNTER.labels("orders").inc()
    resp = await client.get(f"{ORDER_URL}/orders")
    resp.raise_for_status()
    return resp.json()

@app.get("/users")
async def list_users(client: httpx.AsyncClient = Depends(get_client)):
    REQUEST_COUNTER.labels("users").inc()
    resp = await client.get(f"{USER_URL}/users")
    resp.raise_for_status()
    return resp.json()

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
