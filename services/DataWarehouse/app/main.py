from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Data Warehouse API", version="v1")

INGEST_COUNTER = Counter("dwh_ingest_total", "Ingested events")

@app.post("/ingest")
async def ingest(payload: dict):
    INGEST_COUNTER.inc()
    return {"status": "accepted"}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
