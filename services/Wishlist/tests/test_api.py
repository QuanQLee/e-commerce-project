import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_wishlist_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/wishlist/u1/p1")
        assert resp.status_code == 200
        resp = await ac.get("/wishlist/u1")
        assert resp.status_code == 200
        assert resp.json() == ["p1"]
