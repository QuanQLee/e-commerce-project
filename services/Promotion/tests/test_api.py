import os

import pytest
from httpx import ASGITransport, AsyncClient

os.environ["PROMOTION_DB_PATH"] = os.path.join(os.path.dirname(__file__), "test_promotion.db")
if os.path.exists(os.environ["PROMOTION_DB_PATH"]):
    os.remove(os.environ["PROMOTION_DB_PATH"])

from app.main import _init_db, app

_init_db()


@pytest.mark.asyncio
async def test_create_coupon_and_redeem_risk_control_with_idempotency():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/coupons", json={"code": "SAVE10", "discount": 10})
        assert resp.status_code == 200

        first = await ac.post(
            "/coupons/redeem",
            json={"code": "SAVE10", "user_id": "u1", "order_id": "o1", "idempotency_key": "idem-1"},
        )
        assert first.status_code == 200

        repeat = await ac.post(
            "/coupons/redeem",
            json={"code": "SAVE10", "user_id": "u1", "order_id": "o1", "idempotency_key": "idem-1"},
        )
        assert repeat.status_code == 200
        assert repeat.json()["used_times"] == 1

        await ac.post("/coupons/redeem", json={"code": "SAVE10", "user_id": "u1", "order_id": "o2"})
        await ac.post("/coupons/redeem", json={"code": "SAVE10", "user_id": "u1", "order_id": "o3"})

        blocked = await ac.post(
            "/coupons/redeem",
            json={"code": "SAVE10", "user_id": "u1", "order_id": "o4"},
        )
        assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_pricing_rules_quote():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/promotions/full-reduction", json={"threshold": 200, "reduction": 20})
        await ac.post(
            "/promotions/tier-pricing",
            json={
                "product_id": "sku-1",
                "tiers": [
                    {"min_qty": 1, "unit_price": 100},
                    {"min_qty": 3, "unit_price": 90},
                ],
            },
        )
        await ac.post(
            "/promotions/member-pricing",
            json={"product_id": "sku-1", "member_level": "gold", "price": 80},
        )

        quote = await ac.post(
            "/promotions/quote",
            json={
                "product_id": "sku-1",
                "quantity": 3,
                "unit_price": 100,
                "member_level": "gold",
            },
        )
        assert quote.status_code == 200
        data = quote.json()
        assert data["tier_unit_price"] == 90
        assert data["member_unit_price"] == 80
        assert data["subtotal"] == 240
        assert data["full_reduction"] == 20
        assert data["payable"] == 220


@pytest.mark.asyncio
async def test_invalid_coupon_discount():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/coupons", json={"code": "BAD", "discount": 150})
        assert resp.status_code == 400
