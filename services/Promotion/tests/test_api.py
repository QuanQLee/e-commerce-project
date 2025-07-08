import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app

@pytest.mark.asyncio
async def test_create_coupon():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/coupons", json={"code": "SAVE10", "discount": 10})
        assert resp.status_code == 200
        assert resp.json()["status"] == "created"

        resp = await ac.get("/coupons")
        data = resp.json()
        assert any(c["code"] == "SAVE10" for c in data)
