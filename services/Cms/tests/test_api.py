import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app, Article

@pytest.mark.asyncio
async def test_create_and_list_articles():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/articles", json={"title": "t", "content": "c"})
        assert resp.status_code == 200
        resp = await ac.get("/articles")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert data[0]["title"] == "t"
