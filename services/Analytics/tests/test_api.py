import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient

os.environ.setdefault("ConnectionStrings__AnalyticsDb", "sqlite+aiosqlite:///:memory:")
from app.main import app, init_db

@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_create_event():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.post("/events", json={"event_type": "view", "payload": {"id": 1}})
        assert resp.status_code == 200
        assert resp.json()["status"] == "received"

@pytest.mark.asyncio
async def test_get_metrics():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        resp = await ac.get("/metrics")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)
