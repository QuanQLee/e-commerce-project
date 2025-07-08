import logging
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("promotion")

app = FastAPI(title="Promotion API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COUPON_COUNTER = Counter("coupons_created_total", "Total coupons created")

class Coupon(BaseModel):
    code: str
    discount: float

coupons: List[Coupon] = []

@app.post("/coupons")
async def create_coupon(coupon: Coupon):
    coupons.append(coupon)
    logger.info("created coupon", extra={"code": coupon.code})
    COUPON_COUNTER.inc()
    return {"status": "created"}

@app.get("/coupons")
async def list_coupons():
    return coupons

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
