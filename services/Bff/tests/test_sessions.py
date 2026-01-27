import os

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

os.environ.setdefault("BFF_CLIENT_ID", "test-client")
os.environ.setdefault("BFF_CLIENT_SECRET", "test-secret")
os.environ.setdefault("BFF_SESSION_REDIS_URL", "memory://")

from app.main import app, delete_session, get_session, issue_session  # noqa: E402


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_session_round_trip():
    sid = await issue_session("access", 60, "refresh", "scope")
    session = await get_session(sid)
    assert session["access_token"] == "access"
    await delete_session(sid)
    with pytest.raises(HTTPException):
        await get_session(sid)
