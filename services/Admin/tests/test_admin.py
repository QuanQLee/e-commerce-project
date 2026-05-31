import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.main import app, get_client


class _MockHttpClient:
    async def get(self, _url: str) -> Response:
        return Response(200, json=[{"id": "p1", "name": "demo"}])


@pytest.mark.asyncio
async def test_healthz():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_products_requires_permission_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/products")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_products_allows_permission_header():
    async def _override_get_client():
        yield _MockHttpClient()

    app.dependency_overrides[get_client] = _override_get_client
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://test",
            headers={"X-Consumer-Permissions": "catalog.products.read"},
        ) as ac:
            resp = await ac.get("/products")
    finally:
        app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
