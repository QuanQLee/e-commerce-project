from collections import defaultdict
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, generate_latest
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import structlog

from .db import SessionLocal, engine, init_db
from .models import Inventory, InventoryReservation

app = FastAPI(title="Inventory API", version="v1")
structlog.configure(processors=[structlog.processors.JSONRenderer()])
logger = structlog.get_logger("inventory")

STOCK_COUNTER = Counter("inventory_updates_total", "Inventory updates", ["action"])
INSUFFICIENT_COUNTER = Counter(
    "inventory_insufficient_total", "Inventory reservation failures"
)
LOW_GAUGE = Gauge("inventory_quantity", "Current inventory quantity", ["tenant_id", "product_id"])

DEFAULT_WAREHOUSE = "default"
REGION_WAREHOUSE_RULES = {
    "CN": ["cn-east", "cn-north", "default"],
    "US": ["us-west", "us-east", "default"],
    "EU": ["eu-central", "eu-west", "default"],
}


class StockUpdate(BaseModel):
    product_id: str
    quantity: int


class WarehouseStockUpdate(BaseModel):
    warehouse_id: str
    product_id: str
    quantity: int


class FulfillmentItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class PreallocateRequest(BaseModel):
    order_id: str
    items: list[FulfillmentItem]
    shipping_region: Optional[str] = None
    preferred_warehouse_id: Optional[str] = None


class OrderReservationRequest(BaseModel):
    order_id: str


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tenant_id(request: Request) -> str:
    tenant_id = request.headers.get("X-Tenant-Id", "public").strip()
    return tenant_id or "public"


@app.on_event("startup")
def startup():
    init_db()
    refresh_product_gauges(SessionLocal())


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ready"}


def refresh_product_gauges(db: Session):
    try:
        rows = db.query(Inventory).all()
        totals: dict[tuple[str, str], int] = defaultdict(int)
        for row in rows:
            totals[(row.tenant_id, row.product_id)] += row.quantity
        for (tenant_id, product_id), qty in totals.items():
            LOW_GAUGE.labels(tenant_id, product_id).set(qty)
    finally:
        db.close()


def supports_row_lock(db: Session) -> bool:
    return db.get_bind().dialect.name == "postgresql"


def with_row_lock(query, db: Session):
    return query.with_for_update() if supports_row_lock(db) else query


def get_or_create_inventory(
    db: Session,
    tenant_id: str,
    warehouse_id: str,
    product_id: str,
    *,
    lock: bool = False,
    create: bool = True,
) -> Inventory:
    query = db.query(Inventory).filter(
        Inventory.tenant_id == tenant_id,
        Inventory.warehouse_id == warehouse_id,
        Inventory.product_id == product_id,
    )
    if lock:
        query = with_row_lock(query, db)
    inv = query.first()
    if inv is None and not create:
        return None
    if inv is None:
        try:
            with db.begin_nested():
                inv = Inventory(
                    tenant_id=tenant_id,
                    warehouse_id=warehouse_id,
                    product_id=product_id,
                    quantity=0,
                    reserved=0,
                )
                db.add(inv)
                db.flush()
        except IntegrityError:
            inv = query.first()
            if inv is None:
                raise
    return inv


def available_qty(inv: Inventory) -> int:
    return inv.quantity - inv.reserved


def build_warehouse_candidates(
    db: Session,
    tenant_id: str,
    shipping_region: Optional[str],
    preferred_warehouse_id: Optional[str],
) -> list[str]:
    candidates: list[str] = []
    if preferred_warehouse_id:
        candidates.append(preferred_warehouse_id)

    if shipping_region:
        region_key = shipping_region.upper().split("-")[0]
        candidates.extend(REGION_WAREHOUSE_RULES.get(region_key, []))

    existing = [
        row[0]
        for row in db.query(Inventory.warehouse_id)
        .filter(Inventory.tenant_id == tenant_id)
        .distinct()
        .order_by(Inventory.warehouse_id.asc())
        .all()
    ]

    for wid in existing + [DEFAULT_WAREHOUSE]:
        if wid not in candidates:
            candidates.append(wid)

    return candidates


def resolve_fulfillment_warehouse(
    db: Session,
    tenant_id: str,
    items: list[FulfillmentItem],
    shipping_region: Optional[str],
    preferred_warehouse_id: Optional[str],
    *,
    lock_inventory: bool = False,
) -> Optional[str]:
    candidates = build_warehouse_candidates(db, tenant_id, shipping_region, preferred_warehouse_id)
    ordered_items = sorted(items, key=lambda item: item.product_id)
    for warehouse_id in candidates:
        enough_stock = True
        for item in ordered_items:
            inv = get_or_create_inventory(
                db,
                tenant_id,
                warehouse_id,
                item.product_id,
                lock=lock_inventory,
                create=False,
            )
            if inv is None or available_qty(inv) < item.quantity:
                enough_stock = False
                break
        if enough_stock:
            return warehouse_id
    return None


@app.get("/inventory/{product_id}")
def get_stock(
    product_id: str,
    warehouse_id: Optional[str] = None,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if warehouse_id:
        inv = get_or_create_inventory(db, tenant_id, warehouse_id, product_id)
        LOW_GAUGE.labels(tenant_id, product_id).set(inv.quantity)
        return {
            "tenant_id": tenant_id,
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "quantity": inv.quantity,
            "reserved": inv.reserved,
            "available": available_qty(inv),
        }

    rows = (
        db.query(Inventory)
        .filter(Inventory.tenant_id == tenant_id, Inventory.product_id == product_id)
        .order_by(Inventory.warehouse_id.asc())
        .all()
    )
    total_qty = sum(r.quantity for r in rows)
    total_reserved = sum(r.reserved for r in rows)
    LOW_GAUGE.labels(tenant_id, product_id).set(total_qty)
    return {
        "tenant_id": tenant_id,
        "product_id": product_id,
        "quantity": total_qty,
        "reserved": total_reserved,
        "available": total_qty - total_reserved,
        "warehouses": [
            {
                "warehouse_id": r.warehouse_id,
                "quantity": r.quantity,
                "reserved": r.reserved,
                "available": r.quantity - r.reserved,
            }
            for r in rows
        ],
    }


@app.post("/inventory/stock/set")
def set_stock(
    update: WarehouseStockUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if update.quantity < 0:
        raise HTTPException(status_code=400, detail="quantity must be non-negative")
    inv = get_or_create_inventory(db, tenant_id, update.warehouse_id, update.product_id, lock=True)
    if update.quantity < inv.reserved:
        raise HTTPException(
            status_code=409,
            detail="quantity cannot be lower than reserved stock",
        )
    inv.quantity = update.quantity
    db.commit()
    STOCK_COUNTER.labels("set").inc()
    LOW_GAUGE.labels(tenant_id, inv.product_id).set(inv.quantity)
    return {
        "tenant_id": tenant_id,
        "warehouse_id": inv.warehouse_id,
        "product_id": inv.product_id,
        "quantity": inv.quantity,
        "reserved": inv.reserved,
        "available": available_qty(inv),
    }


@app.post("/inventory/preallocate")
def preallocate_stock(
    req: PreallocateRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if not req.items:
        raise HTTPException(status_code=400, detail="items cannot be empty")

    existing = (
        db.query(InventoryReservation)
        .filter(
            InventoryReservation.tenant_id == tenant_id,
            InventoryReservation.order_id == req.order_id,
            InventoryReservation.status == "PREALLOCATED",
        )
        .first()
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="order already preallocated")

    warehouse_id = resolve_fulfillment_warehouse(
        db,
        tenant_id,
        req.items,
        req.shipping_region,
        req.preferred_warehouse_id,
        lock_inventory=True,
    )
    if warehouse_id is None:
        INSUFFICIENT_COUNTER.inc()
        raise HTTPException(status_code=400, detail="insufficient stock in all warehouses")

    for item in sorted(req.items, key=lambda entry: entry.product_id):
        inv = get_or_create_inventory(db, tenant_id, warehouse_id, item.product_id, lock=True)
        if available_qty(inv) < item.quantity:
            db.rollback()
            INSUFFICIENT_COUNTER.inc()
            raise HTTPException(status_code=409, detail="stock changed, retry preallocation")
        inv.reserved += item.quantity
        db.add(
            InventoryReservation(
                tenant_id=tenant_id,
                order_id=req.order_id,
                warehouse_id=warehouse_id,
                product_id=item.product_id,
                quantity=item.quantity,
                status="PREALLOCATED",
            )
        )

    db.commit()
    STOCK_COUNTER.labels("preallocate").inc()
    logger.info(
        "preallocate",
        tenant_id=tenant_id,
        order_id=req.order_id,
        warehouse_id=warehouse_id,
        items=[item.model_dump() for item in req.items],
    )
    return {
        "tenant_id": tenant_id,
        "order_id": req.order_id,
        "warehouse_id": warehouse_id,
        "status": "PREALLOCATED",
    }


@app.post("/inventory/deduct")
def deduct_preallocated_stock(
    req: OrderReservationRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    reservations = with_row_lock(
        db.query(InventoryReservation)
        .filter(
            InventoryReservation.tenant_id == tenant_id,
            InventoryReservation.order_id == req.order_id,
            InventoryReservation.status == "PREALLOCATED",
        ),
        db,
    ).all()
    if not reservations:
        raise HTTPException(status_code=404, detail="no preallocated stock found for order")

    for reservation in sorted(reservations, key=lambda entry: (entry.warehouse_id, entry.product_id)):
        inv = get_or_create_inventory(
            db,
            tenant_id,
            reservation.warehouse_id,
            reservation.product_id,
            lock=True,
        )
        if inv.reserved < reservation.quantity or inv.quantity < reservation.quantity:
            db.rollback()
            raise HTTPException(status_code=409, detail="inventory inconsistency detected")
        inv.reserved -= reservation.quantity
        inv.quantity -= reservation.quantity
        reservation.status = "DEDUCTED"

    db.commit()
    STOCK_COUNTER.labels("deduct").inc()
    logger.info("deduct", tenant_id=tenant_id, order_id=req.order_id)
    return {"tenant_id": tenant_id, "order_id": req.order_id, "status": "DEDUCTED"}


@app.post("/inventory/release-preallocation")
def release_preallocation(
    req: OrderReservationRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    reservations = with_row_lock(
        db.query(InventoryReservation)
        .filter(
            InventoryReservation.tenant_id == tenant_id,
            InventoryReservation.order_id == req.order_id,
            InventoryReservation.status == "PREALLOCATED",
        ),
        db,
    ).all()
    if not reservations:
        raise HTTPException(status_code=404, detail="no preallocated stock found for order")

    for reservation in sorted(reservations, key=lambda entry: (entry.warehouse_id, entry.product_id)):
        inv = get_or_create_inventory(
            db,
            tenant_id,
            reservation.warehouse_id,
            reservation.product_id,
            lock=True,
        )
        inv.reserved = max(0, inv.reserved - reservation.quantity)
        reservation.status = "RELEASED"

    db.commit()
    STOCK_COUNTER.labels("release_preallocation").inc()
    logger.info("release_preallocation", tenant_id=tenant_id, order_id=req.order_id)
    return {"tenant_id": tenant_id, "order_id": req.order_id, "status": "RELEASED"}


@app.post("/inventory/fulfillment/resolve")
def resolve_fulfillment(
    req: PreallocateRequest,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if not req.items:
        raise HTTPException(status_code=400, detail="items cannot be empty")
    warehouse_id = resolve_fulfillment_warehouse(
        db,
        tenant_id,
        req.items,
        req.shipping_region,
        req.preferred_warehouse_id,
    )
    if warehouse_id is None:
        raise HTTPException(status_code=400, detail="no warehouse can fulfill this order")
    return {
        "tenant_id": tenant_id,
        "order_id": req.order_id,
        "shipping_region": req.shipping_region,
        "warehouse_id": warehouse_id,
    }


@app.post("/inventory/reserve")
def reserve_stock(
    update: StockUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if update.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")

    inv = get_or_create_inventory(db, tenant_id, DEFAULT_WAREHOUSE, update.product_id, lock=True)
    if available_qty(inv) < update.quantity:
        INSUFFICIENT_COUNTER.inc()
        raise HTTPException(status_code=400, detail="insufficient stock")

    inv.quantity -= update.quantity
    db.commit()
    STOCK_COUNTER.labels("reserve").inc()
    LOW_GAUGE.labels(tenant_id, inv.product_id).set(inv.quantity)
    logger.info(
        "reserve",
        tenant_id=tenant_id,
        warehouse_id=inv.warehouse_id,
        product_id=inv.product_id,
        quantity=inv.quantity,
    )
    return {"tenant_id": tenant_id, "reserved": update.quantity, "warehouse_id": inv.warehouse_id}


@app.post("/inventory/release")
def release_stock(
    update: StockUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: Session = Depends(get_db),
):
    if update.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")

    inv = get_or_create_inventory(db, tenant_id, DEFAULT_WAREHOUSE, update.product_id, lock=True)
    inv.quantity += update.quantity
    db.commit()
    STOCK_COUNTER.labels("release").inc()
    LOW_GAUGE.labels(tenant_id, inv.product_id).set(inv.quantity)
    logger.info(
        "release",
        tenant_id=tenant_id,
        warehouse_id=inv.warehouse_id,
        product_id=inv.product_id,
        quantity=inv.quantity,
    )
    return {"tenant_id": tenant_id, "released": update.quantity, "warehouse_id": inv.warehouse_id}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
