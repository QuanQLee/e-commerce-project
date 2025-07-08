import logging
from typing import List
from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("recommendation")

app = FastAPI(title="Recommendation API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_COUNTER = Counter("recommendation_requests_total", "Recommendation requests")

SAMPLE_DATA = {
    "p1": ["p2", "p3"],
    "p2": ["p1", "p4"],
}

@app.get("/recommendations/{product_id}")
async def get_recommendations(product_id: str):
    REQUEST_COUNTER.inc()
    return SAMPLE_DATA.get(product_id, [])

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
