import logging
import os
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

from app.migrations import run_sqlite_migrations

logging.basicConfig(
    format='{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}',
    level=logging.INFO,
)
logger = logging.getLogger("promotion")

DB_PATH = os.getenv("PROMOTION_DB_PATH", "promotion.db")
MAX_REDEEM_PER_USER = 3

app = FastAPI(title="Promotion API", version="v1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COUPON_COUNTER = Counter("coupons_created_total", "Total coupons created")
REDEEM_COUNTER = Counter("coupon_redeems_total", "Coupon redeems")
RISK_BLOCK_COUNTER = Counter("coupon_risk_block_total", "Coupon risk blocks")


class Coupon(BaseModel):
    code: str
    discount: float


class FullReductionRule(BaseModel):
    threshold: float = Field(gt=0)
    reduction: float = Field(gt=0)


class TierPriceRule(BaseModel):
    product_id: str
    tiers: list[dict[str, float]]


class MemberPriceRule(BaseModel):
    product_id: str
    member_level: str
    price: float = Field(gt=0)


class PriceQuoteRequest(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)
    unit_price: float = Field(gt=0)
    member_level: str | None = None


class CouponRedeemRequest(BaseModel):
    code: str
    user_id: str
    order_id: str
    idempotency_key: str | None = None


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    run_sqlite_migrations(DB_PATH)


@app.on_event("startup")
async def startup() -> None:
    _init_db()


@app.post("/coupons")
async def create_coupon(coupon: Coupon):
    if coupon.discount < 0 or coupon.discount > 100:
        raise HTTPException(status_code=400, detail="discount must be between 0 and 100")

    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO coupons (code, discount) VALUES (?, ?)",
            (coupon.code, coupon.discount),
        )
        conn.commit()

    logger.info("created coupon", extra={"code": coupon.code})
    COUPON_COUNTER.inc()
    return {"status": "created"}


@app.get("/coupons")
async def list_coupons():
    with _conn() as conn:
        rows = conn.execute("SELECT code, discount FROM coupons ORDER BY code").fetchall()
    return [dict(row) for row in rows]


@app.post("/promotions/full-reduction")
async def create_full_reduction(rule: FullReductionRule):
    with _conn() as conn:
        conn.execute(
            "INSERT INTO full_reduction_rules (threshold, reduction) VALUES (?, ?)",
            (rule.threshold, rule.reduction),
        )
        conn.commit()
        count = conn.execute("SELECT COUNT(*) AS c FROM full_reduction_rules").fetchone()["c"]
    return {"status": "created", "count": count}


@app.post("/promotions/tier-pricing")
async def create_tier_pricing(rule: TierPriceRule):
    cleaned: list[tuple[int, float]] = []
    for tier in rule.tiers:
        min_qty = int(tier.get("min_qty", 0))
        unit_price = float(tier.get("unit_price", 0))
        if min_qty <= 0 or unit_price <= 0:
            raise HTTPException(status_code=400, detail="invalid tier config")
        cleaned.append((min_qty, unit_price))

    with _conn() as conn:
        conn.execute("DELETE FROM tier_price_rules WHERE product_id = ?", (rule.product_id,))
        for min_qty, unit_price in sorted(cleaned, key=lambda item: item[0]):
            conn.execute(
                "INSERT INTO tier_price_rules (product_id, min_qty, unit_price) VALUES (?, ?, ?)",
                (rule.product_id, min_qty, unit_price),
            )
        conn.commit()
    return {"status": "created", "product_id": rule.product_id}


@app.post("/promotions/member-pricing")
async def create_member_pricing(rule: MemberPriceRule):
    with _conn() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO member_price_rules (product_id, member_level, price)
            VALUES (?, ?, ?)
            """,
            (rule.product_id, rule.member_level.lower(), rule.price),
        )
        conn.commit()
    return {"status": "created", "product_id": rule.product_id, "member_level": rule.member_level}


def _tier_unit_price(conn: sqlite3.Connection, product_id: str, quantity: int, default_price: float) -> float:
    rows = conn.execute(
        "SELECT min_qty, unit_price FROM tier_price_rules WHERE product_id = ? ORDER BY min_qty ASC",
        (product_id,),
    ).fetchall()
    chosen = default_price
    for row in rows:
        if quantity >= int(row["min_qty"]):
            chosen = float(row["unit_price"])
    return chosen


def _member_unit_price(conn: sqlite3.Connection, product_id: str, member_level: str | None, base_price: float) -> float:
    if not member_level:
        return base_price
    row = conn.execute(
        "SELECT price FROM member_price_rules WHERE product_id = ? AND member_level = ?",
        (product_id, member_level.lower()),
    ).fetchone()
    return float(row["price"]) if row else base_price


def _full_reduction(conn: sqlite3.Connection, amount: float) -> float:
    rows = conn.execute("SELECT threshold, reduction FROM full_reduction_rules ORDER BY threshold ASC").fetchall()
    best = 0.0
    for row in rows:
        if amount >= float(row["threshold"]):
            best = max(best, float(row["reduction"]))
    return best


@app.post("/promotions/quote")
async def quote_price(req: PriceQuoteRequest):
    with _conn() as conn:
        tier_price = _tier_unit_price(conn, req.product_id, req.quantity, req.unit_price)
        member_price = _member_unit_price(conn, req.product_id, req.member_level, tier_price)
        subtotal = member_price * req.quantity
        reduction = _full_reduction(conn, subtotal)

    final_amount = max(0.0, subtotal - reduction)
    return {
        "product_id": req.product_id,
        "quantity": req.quantity,
        "tier_unit_price": tier_price,
        "member_unit_price": member_price,
        "subtotal": round(subtotal, 2),
        "full_reduction": round(reduction, 2),
        "payable": round(final_amount, 2),
    }


@app.post("/coupons/redeem")
async def redeem_coupon(req: CouponRedeemRequest):
    with _conn() as conn:
        coupon = conn.execute("SELECT * FROM coupons WHERE code = ?", (req.code,)).fetchone()
        if coupon is None:
            raise HTTPException(status_code=404, detail="coupon not found")

        idem_key = (req.idempotency_key or "").strip()
        if idem_key:
            idem_row = conn.execute(
                "SELECT * FROM coupon_redeems WHERE code = ? AND user_id = ? AND idempotency_key = ?",
                (req.code, req.user_id, idem_key),
            ).fetchone()
            if idem_row is not None:
                return {
                    "status": "redeemed",
                    "code": idem_row["code"],
                    "user_id": idem_row["user_id"],
                    "order_id": idem_row["order_id"],
                    "used_times": idem_row["used_times"],
                    "discount": idem_row["discount"],
                }

        order_row = conn.execute(
            "SELECT * FROM coupon_redeems WHERE code = ? AND order_id = ?",
            (req.code, req.order_id),
        ).fetchone()
        if order_row is not None:
            RISK_BLOCK_COUNTER.inc()
            raise HTTPException(status_code=409, detail="coupon already redeemed for this order")

        used_times = conn.execute(
            "SELECT COUNT(*) AS c FROM coupon_redeems WHERE code = ? AND user_id = ?",
            (req.code, req.user_id),
        ).fetchone()["c"]
        if used_times >= MAX_REDEEM_PER_USER:
            RISK_BLOCK_COUNTER.inc()
            raise HTTPException(status_code=429, detail="redeem risk control: user limit exceeded")

        next_times = int(used_times) + 1
        conn.execute(
            """
            INSERT INTO coupon_redeems (code, user_id, order_id, idempotency_key, used_times, discount)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (req.code, req.user_id, req.order_id, idem_key if idem_key else None, next_times, float(coupon["discount"])),
        )
        conn.commit()

    REDEEM_COUNTER.inc()
    return {
        "status": "redeemed",
        "code": req.code,
        "user_id": req.user_id,
        "order_id": req.order_id,
        "used_times": next_times,
        "discount": float(coupon["discount"]),
    }


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/prometheus")
async def prometheus_metrics():
    data = generate_latest()
    return Response(content=data, media_type=CONTENT_TYPE_LATEST)
