from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI(title="Moderation API", version="v1")

REQUEST_COUNTER = Counter("moderation_requests_total", "Moderation requests")

@app.post("/moderate")
async def moderate(payload: dict):
    REQUEST_COUNTER.inc()
    return {"flagged": False}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
