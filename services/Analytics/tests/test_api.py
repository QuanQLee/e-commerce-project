import asyncio
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure the app uses an in-memory database during tests
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
from app.main import app, init_db

@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_db():
    await init_db()

@pytest.mark.asyncio
async def test_create_event():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/events", json={"event_type": "view", "payload": {"id": 1}})
        assert resp.status_code == 200
        assert resp.json()["status"] == "received"

@pytest.mark.asyncio
async def test_get_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/metrics")
        assert resp.status_code == 200
        assert isinstance(resp.json(), dict)

@pytest.mark.asyncio
async def test_event_payload_too_large():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        big = {"data": "x" * 2000}
        resp = await ac.post("/events", json={"event_type": "view", "payload": big})
        assert resp.status_code == 422
