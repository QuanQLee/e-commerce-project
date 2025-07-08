import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_and_list_reviews():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/reviews",
            json={"product_id": "p1", "user_id": "u1", "rating": 5, "comment": "good"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "created"

        resp = await ac.get("/reviews/p1")
        data = resp.json()
        assert any(r["user_id"] == "u1" for r in data)
