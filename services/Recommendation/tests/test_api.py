import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_recommendations():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/recommendations/p1")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
