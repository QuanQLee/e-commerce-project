import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_assign_variant():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/assign/test-exp")
        assert resp.status_code == 200
        assert resp.json()["experiment"] == "test-exp"
        assert resp.json()["variant"] in ["A", "B"]
