import logging
from typing import List
from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("review")

app = FastAPI(title="Review API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REVIEW_COUNTER = Counter("reviews_created_total", "Total product reviews created")

class Review(BaseModel):
    product_id: str
    user_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = None

reviews: List[Review] = []

@app.post("/reviews")
async def create_review(review: Review):
    reviews.append(review)
    logger.info("created review", extra={"product_id": review.product_id, "user_id": review.user_id})
    REVIEW_COUNTER.inc()
    return {"status": "created"}

@app.get("/reviews/{product_id}")
async def list_reviews(product_id: str):
    return [r for r in reviews if r.product_id == product_id]

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
