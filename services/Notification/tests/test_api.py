import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app

@pytest.mark.asyncio
async def test_send_email():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/email", json={"to": "a@example.com", "subject": "hi", "body": "test"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "queued"
