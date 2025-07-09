from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging, json
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

from .db import SessionLocal, init_db
from .models import Inventory

app = FastAPI(title="Inventory API", version="v1")
logging.basicConfig(format='%(message)s', level=logging.INFO)
logger = logging.getLogger("inventory")

STOCK_COUNTER = Counter("inventory_updates_total", "Inventory updates", ["action"])
INSUFFICIENT_COUNTER = Counter(
    "inventory_insufficient_total", "Inventory reservation failures"
)
LOW_GAUGE = Gauge("inventory_quantity", "Current inventory quantity", ["product_id"])

class StockUpdate(BaseModel):
    product_id: str
    quantity: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup():
    init_db()
    # populate gauges with current quantities
    db = SessionLocal()
    try:
        for inv in db.query(Inventory).all():
            LOW_GAUGE.labels(inv.product_id).set(inv.quantity)
    finally:
        db.close()

@app.get("/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/inventory/{product_id}")
def get_stock(product_id: str, db: Session = Depends(get_db)):
    inv = db.get(Inventory, product_id)
    qty = inv.quantity if inv else 0
    LOW_GAUGE.labels(product_id).set(qty)
    return {"product_id": product_id, "quantity": qty}

@app.post("/inventory/reserve")
def reserve_stock(update: StockUpdate, db: Session = Depends(get_db)):
    inv = db.get(Inventory, update.product_id)
    if inv is None:
        inv = Inventory(product_id=update.product_id, quantity=0)
        db.add(inv)
    if inv.quantity < update.quantity:
        INSUFFICIENT_COUNTER.inc()
        raise HTTPException(status_code=400, detail="insufficient stock")
    inv.quantity -= update.quantity
    db.commit()
    STOCK_COUNTER.labels("reserve").inc()
    LOW_GAUGE.labels(inv.product_id).set(inv.quantity)
    logger.info(json.dumps({"action": "reserve", "product_id": inv.product_id, "quantity": inv.quantity}))
    return {"reserved": update.quantity}

@app.post("/inventory/release")
def release_stock(update: StockUpdate, db: Session = Depends(get_db)):
    inv = db.get(Inventory, update.product_id)
    if inv is None:
        inv = Inventory(product_id=update.product_id, quantity=0)
        db.add(inv)
    inv.quantity += update.quantity
    db.commit()
    STOCK_COUNTER.labels("release").inc()
    LOW_GAUGE.labels(inv.product_id).set(inv.quantity)
    logger.info(json.dumps({"action": "release", "product_id": inv.product_id, "quantity": inv.quantity}))
    return {"released": update.quantity}

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
