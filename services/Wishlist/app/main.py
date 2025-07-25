import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("wishlist")

app = FastAPI(title="Wishlist API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUEST_COUNTER = Counter("wishlist_requests_total", "Wishlist requests")

wishlists = {}

@app.post("/wishlist/{user_id}/{product_id}")
async def add_item(user_id: str, product_id: str):
    REQUEST_COUNTER.inc()
    wishlists.setdefault(user_id, []).append(product_id)
    logger.info("added item", extra={"user": user_id, "product": product_id})
    return {"status": "added"}

@app.get("/wishlist/{user_id}")
async def get_wishlist(user_id: str):
    REQUEST_COUNTER.inc()
    return wishlists.get(user_id, [])

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
