import json
import os
from urllib.parse import parse_qs, urlparse

import pytest
import httpx
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from httpx import AsyncClient

os.environ.setdefault("BFF_CLIENT_ID", "test-client")
os.environ.setdefault("BFF_CLIENT_SECRET", "test-secret")
os.environ.setdefault("BFF_SESSION_REDIS_URL", "memory://")
os.environ.setdefault("BFF_ALLOW_SELF_REGISTRATION", "true")

import app.main as main  # noqa: E402
from app.main import app, delete_session, get_session, issue_session, _resolve_tenant_id, _user_lookup_by_username_url  # noqa: E402


class _FakeUpstreamResponse:
    def __init__(self, status_code: int = 200, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {"ok": True}
        self.content = json.dumps(self._payload).encode("utf-8")
        self.headers = {"content-type": "application/json", "x-upstream": "1"}


def _patch_upstream(monkeypatch: pytest.MonkeyPatch, calls: list[dict]) -> None:
    class _FakeAsyncClient:
        async def request(self, method: str, url: str, headers=None, content=None, **kwargs):
            calls.append(
                {
                    "method": method,
                    "url": url,
                    "headers": dict(headers or {}),
                    "content": content,
                }
            )
            return _FakeUpstreamResponse()

    fake_client = _FakeAsyncClient()
    monkeypatch.setattr("app.main._shared_http_client", lambda: fake_client)


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
    assert session["tenant_id"] == "public"
    await delete_session(sid)
    with pytest.raises(HTTPException):
        await get_session(sid)


@pytest.mark.asyncio
async def test_session_round_trip_with_tenant():
    sid = await issue_session("access", 60, "refresh", "scope", "tenant-a")
    session = await get_session(sid)
    assert session["tenant_id"] == "tenant-a"


@pytest.mark.asyncio
async def test_resolve_tenant_id_prefers_user_service(monkeypatch):
    async def _fake_lookup(_username: str):
        return "tenant-from-user-service"

    monkeypatch.setattr("app.main._lookup_tenant_id_by_username", _fake_lookup)
    tenant = await _resolve_tenant_id("user1", None)
    assert tenant == "tenant-from-user-service"


@pytest.mark.asyncio
async def test_resolve_tenant_id_falls_back_to_mapping(monkeypatch):
    async def _fake_lookup(_username: str):
        return None

    monkeypatch.setattr("app.main._lookup_tenant_id_by_username", _fake_lookup)
    tenant = await _resolve_tenant_id("user1", None)
    assert tenant == "tenant-a"


def test_user_lookup_by_username_url_includes_tenant_query():
    url = _user_lookup_by_username_url("user1", "tenant-a")
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    assert parsed.path.endswith("/users/by-username/user1")
    assert query["tenantId"] == ["tenant-a"]


def test_validate_runtime_settings_rejects_memory_store_in_production(monkeypatch):
    monkeypatch.setattr(main, "APP_ENVIRONMENT", "Production")
    monkeypatch.setattr(main, "USE_MEMORY_STORE", True)
    monkeypatch.setattr(main, "BFF_ALLOW_PASSWORD_GRANT", False)
    monkeypatch.setattr(main, "BFF_ALLOW_SELF_REGISTRATION", False)
    monkeypatch.setattr(main, "COOKIE_SECURE", True)
    monkeypatch.setattr(main, "AUTH_PUBLIC_BASE", "https://auth.example.com")
    monkeypatch.setattr(main, "BFF_REDIRECT_URI", "https://shop.example.com/auth/callback")
    monkeypatch.setattr(main, "REDIS_URL", "memory://")
    monkeypatch.setattr(main, "ALLOWED_ORIGINS", ["https://shop.example.com"])

    with pytest.raises(RuntimeError, match="memory://"):
        main._validate_runtime_settings()


def test_validate_runtime_settings_rejects_insecure_production_public_endpoints(monkeypatch):
    monkeypatch.setattr(main, "APP_ENVIRONMENT", "Production")
    monkeypatch.setattr(main, "USE_MEMORY_STORE", False)
    monkeypatch.setattr(main, "BFF_ALLOW_PASSWORD_GRANT", False)
    monkeypatch.setattr(main, "BFF_ALLOW_SELF_REGISTRATION", False)
    monkeypatch.setattr(main, "COOKIE_SECURE", True)
    monkeypatch.setattr(main, "AUTH_PUBLIC_BASE", "http://auth.example.com")
    monkeypatch.setattr(main, "BFF_REDIRECT_URI", "https://shop.example.com/auth/callback")
    monkeypatch.setattr(main, "REDIS_URL", "rediss://:secret@cache.example.com:6379/0")
    monkeypatch.setattr(main, "ALLOWED_ORIGINS", ["https://shop.example.com"])

    with pytest.raises(RuntimeError, match="AUTH_PUBLIC_BASE"):
        main._validate_runtime_settings()


def test_validate_runtime_settings_accepts_hardened_production(monkeypatch):
    monkeypatch.setattr(main, "APP_ENVIRONMENT", "Production")
    monkeypatch.setattr(main, "USE_MEMORY_STORE", False)
    monkeypatch.setattr(main, "BFF_ALLOW_PASSWORD_GRANT", False)
    monkeypatch.setattr(main, "BFF_ALLOW_SELF_REGISTRATION", False)
    monkeypatch.setattr(main, "COOKIE_SECURE", True)
    monkeypatch.setattr(main, "AUTH_PUBLIC_BASE", "https://auth.example.com")
    monkeypatch.setattr(main, "BFF_REDIRECT_URI", "https://shop.example.com/auth/callback")
    monkeypatch.setattr(main, "REDIS_URL", "rediss://:secret@cache.example.com:6379/0")
    monkeypatch.setattr(main, "ALLOWED_ORIGINS", ["https://shop.example.com", "https://merchant.example.com"])

    main._validate_runtime_settings()


@pytest.mark.asyncio
async def test_register_route_exists(monkeypatch):
    async def _fake_register(_payload):
        return JSONResponse(status_code=200, content={"ok": True})

    monkeypatch.setattr("app.main._register_account", _fake_register)
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post("/auth/register", json={"username": "demo", "password": "secret"})
    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.asyncio
async def test_register_route_rejects_when_disabled(monkeypatch):
    monkeypatch.setattr("app.main.BFF_ALLOW_SELF_REGISTRATION", False)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post("/auth/register", json={"username": "demo", "password": "secret123"})

    assert response.status_code == 403
    assert response.json()["detail"] == "Self-service registration is disabled."


@pytest.mark.asyncio
async def test_auth_me_returns_current_session():
    sid = await issue_session("access", 60, "refresh", "scope-a", "tenant-a")
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        client.cookies.set("sid", sid)
        response = await client.get("/auth/me")

    assert response.status_code == 200
    payload = response.json()
    assert payload["authenticated"] is True
    assert payload["tenant_id"] == "tenant-a"
    assert payload["scope"] == "scope-a"
    assert isinstance(payload["expires_at"], int)


@pytest.mark.asyncio
async def test_proxy_uses_session_token_and_tenant_over_request_headers(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)
    sid = await issue_session(
        "session-token",
        60,
        "refresh",
        "scope-a",
        "tenant-a",
        user_profile={
            "id": "44444444-4444-4444-4444-444444444444",
            "userName": "user1",
            "tenantId": "tenant-a",
        },
    )

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        client.cookies.set("sid", sid)
        response = await client.get(
            "/api/v1/order/orders",
            headers={
                "Authorization": "Bearer client-token",
                "X-Tenant-Id": "tenant-b",
            },
        )

    assert response.status_code == 200
    assert calls[0]["url"] == "http://order.api:8080/orders"
    assert calls[0]["headers"]["Authorization"] == "Bearer session-token"
    assert calls[0]["headers"]["X-Tenant-Id"] == "tenant-a"
    assert calls[0]["headers"]["X-User-Id"] == "44444444-4444-4444-4444-444444444444"


@pytest.mark.asyncio
async def test_proxy_accepts_bearer_without_session(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/catalog/products",
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-mobile",
            },
        )

    assert response.status_code == 200
    assert calls[0]["url"] == "http://catalog.api:8080/products"
    assert calls[0]["headers"]["Authorization"] == "Bearer mobile-token"
    assert calls[0]["headers"]["X-Tenant-Id"] == "tenant-mobile"


@pytest.mark.asyncio
async def test_proxy_requires_auth_when_session_and_bearer_are_missing():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get("/api/v1/catalog/products")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


@pytest.mark.asyncio
async def test_proxy_returns_gateway_timeout_when_upstream_times_out(monkeypatch):
    class _TimeoutClient:
        async def request(self, method: str, url: str, **kwargs):
            raise httpx.ReadTimeout("slow upstream")

    monkeypatch.setattr("app.main._shared_http_client", lambda: _TimeoutClient())

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/catalog/products",
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-mobile",
            },
        )

    assert response.status_code == 504
    assert response.json()["detail"] == "Upstream service timed out."


@pytest.mark.asyncio
async def test_oidc_login_redirects_to_authorize():
    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/auth/oidc/login",
            params={
                "redirect": "http://localhost:3002/orders",
                "tenant_id": "tenant-a",
            },
            follow_redirects=False,
        )

    assert response.status_code == 302
    location = response.headers["location"]
    parsed = urlparse(location)
    query = parse_qs(parsed.query)
    assert parsed.scheme == "http"
    assert parsed.netloc == "localhost:7000"
    assert parsed.path == "/connect/authorize"
    assert query["client_id"] == ["bff-web"]
    assert query["redirect_uri"] == ["http://localhost:8000/auth/callback"]
    assert query["scope"] == ["openid profile api1 offline_access"]
    assert query["code_challenge_method"] == ["S256"]
    assert "state" in query
    assert "code_challenge" in query


@pytest.mark.asyncio
async def test_oidc_callback_creates_session_and_refresh_uses_oidc_client(monkeypatch):
    token_forms: list[dict[str, str]] = []

    async def _fake_call_token_endpoint(form: dict[str, str]):
        token_forms.append(dict(form))
        return {
            "access_token": f"oidc-token-{len(token_forms)}",
            "refresh_token": f"oidc-refresh-{len(token_forms)}",
            "expires_in": 60,
            "scope": "openid profile api1 offline_access",
        }

    monkeypatch.setattr("app.main._call_token_endpoint", _fake_call_token_endpoint)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        login_response = await client.get(
            "/auth/oidc/login",
            params={
                "redirect": "http://localhost:3002/orders",
                "tenant_id": "tenant-b",
            },
            follow_redirects=False,
        )
        authorize_query = parse_qs(urlparse(login_response.headers["location"]).query)
        state = authorize_query["state"][0]

        callback_response = await client.get(
            "/auth/callback",
            params={"code": "auth-code", "state": state},
            follow_redirects=False,
        )

        assert callback_response.status_code == 302
        assert callback_response.headers["location"] == "http://localhost:3002/orders"
        assert client.cookies.get("sid")

        me_response = await client.get("/auth/me")
        assert me_response.status_code == 200
        assert me_response.json()["tenant_id"] == "tenant-b"

        refresh_response = await client.post("/auth/refresh")
        assert refresh_response.status_code == 200
        assert refresh_response.json()["tenant_id"] == "tenant-b"

    assert token_forms[0]["client_id"] == "bff-web"
    assert token_forms[0]["grant_type"] == "authorization_code"
    assert token_forms[0]["redirect_uri"] == "http://localhost:8000/auth/callback"
    assert "client_secret" not in token_forms[0]
    assert token_forms[1]["client_id"] == "bff-web"
    assert token_forms[1]["grant_type"] == "refresh_token"
    assert "client_secret" not in token_forms[1]


@pytest.mark.asyncio
async def test_mobile_login_returns_tokens_and_user_profile(monkeypatch):
    monkeypatch.setattr("app.main.BFF_ALLOW_PASSWORD_GRANT", True)

    async def _fake_call_token_endpoint(form: dict[str, str]):
        assert form["grant_type"] == "password"
        assert form["username"] == "user1"
        return {
            "access_token": "mobile-access",
            "refresh_token": "mobile-refresh",
            "expires_in": 120,
            "scope": "api1 offline_access",
        }

    async def _fake_resolve_tenant_id(username: str, tenant_id: str | None):
        assert username == "user1"
        assert tenant_id == "tenant-mobile"
        return "tenant-mobile"

    async def _fake_ensure_user_profile(username: str, tenant_id: str):
        assert username == "user1"
        assert tenant_id == "tenant-mobile"
        return {
            "id": "8dc23363-b4e0-4e1f-9ef3-2a64f976b211",
            "userName": "user1",
            "email": "user1@example.com",
            "tenantId": "tenant-mobile",
        }

    monkeypatch.setattr("app.main._call_token_endpoint", _fake_call_token_endpoint)
    monkeypatch.setattr("app.main._resolve_tenant_id", _fake_resolve_tenant_id)
    monkeypatch.setattr("app.main._ensure_user_profile", _fake_ensure_user_profile)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/auth/mobile/login",
            json={
                "username": "user1",
                "password": "pass1",
                "tenant_id": "tenant-mobile",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "mobile-access"
    assert payload["refresh_token"] == "mobile-refresh"
    assert payload["tenant_id"] == "tenant-mobile"
    assert payload["user"]["user_name"] == "user1"
    assert isinstance(payload["expires_at"], int)


@pytest.mark.asyncio
async def test_mobile_refresh_returns_new_tokens(monkeypatch):
    async def _fake_call_token_endpoint(form: dict[str, str]):
        assert form["grant_type"] == "refresh_token"
        assert form["refresh_token"] == "refresh-123"
        return {
            "access_token": "mobile-access-2",
            "refresh_token": "mobile-refresh-2",
            "expires_in": 300,
            "scope": "api1 offline_access",
        }

    monkeypatch.setattr("app.main._call_token_endpoint", _fake_call_token_endpoint)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/auth/mobile/refresh",
            json={
                "refresh_token": "refresh-123",
                "tenant_id": "tenant-mobile",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "mobile-access-2"
    assert payload["refresh_token"] == "mobile-refresh-2"
    assert payload["tenant_id"] == "tenant-mobile"
    assert payload["user"] is None


@pytest.mark.asyncio
async def test_mobile_authorize_returns_pkce_url(monkeypatch):
    monkeypatch.setattr("app.main.BFF_MOBILE_REDIRECT_URIS", ["dsmobile://auth/callback"])
    monkeypatch.setattr("app.main.BFF_MOBILE_OIDC_CLIENT_ID", "mobile-native")

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/auth/mobile/authorize",
            json={
                "redirect_uri": "dsmobile://auth/callback",
                "code_challenge": "challenge-123",
                "state": "state-123",
                "tenant_id": "tenant-a",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    parsed = urlparse(payload["authorize_url"])
    query = parse_qs(parsed.query)
    assert query["client_id"] == ["mobile-native"]
    assert query["redirect_uri"] == ["dsmobile://auth/callback"]
    assert query["code_challenge"] == ["challenge-123"]
    assert query["code_challenge_method"] == ["S256"]
    assert payload["tenant_id"] == "tenant-a"


@pytest.mark.asyncio
async def test_mobile_exchange_uses_public_pkce_client_and_returns_profile(monkeypatch):
    async def _fake_call_token_endpoint(form: dict[str, str]):
        assert form["client_id"] == "mobile-native"
        assert form["grant_type"] == "authorization_code"
        assert form["redirect_uri"] == "dsmobile://auth/callback"
        assert "client_secret" not in form
        return {
            "access_token": "mobile-pkce-access",
            "refresh_token": "mobile-pkce-refresh",
            "expires_in": 180,
            "scope": "openid profile api1 offline_access",
        }

    async def _fake_resolve_user_profile_from_token(access_token: str, tenant_id: str, username_hint: str | None = None):
        assert access_token == "mobile-pkce-access"
        assert tenant_id == "tenant-mobile"
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "authSubjectId": "1001",
            "userName": "user1",
            "email": "user1@example.com",
            "tenantId": "tenant-mobile",
        }

    monkeypatch.setattr("app.main.BFF_MOBILE_REDIRECT_URIS", ["dsmobile://auth/callback"])
    monkeypatch.setattr("app.main.BFF_MOBILE_OIDC_CLIENT_ID", "mobile-native")
    monkeypatch.setattr("app.main._call_token_endpoint", _fake_call_token_endpoint)
    monkeypatch.setattr("app.main._resolve_user_profile_from_token", _fake_resolve_user_profile_from_token)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/auth/mobile/exchange",
            json={
                "code": "auth-code",
                "code_verifier": "verifier-123",
                "redirect_uri": "dsmobile://auth/callback",
                "tenant_id": "tenant-mobile",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["oauth_client_id"] == "mobile-native"
    assert payload["user"]["id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["user"]["auth_subject_id"] == "1001"


@pytest.mark.asyncio
async def test_mobile_refresh_uses_requested_public_client_without_secret(monkeypatch):
    async def _fake_call_token_endpoint(form: dict[str, str]):
        assert form["client_id"] == "mobile-native"
        assert form["grant_type"] == "refresh_token"
        assert form["refresh_token"] == "refresh-abc"
        assert "client_secret" not in form
        return {
            "access_token": "mobile-access-3",
            "refresh_token": "mobile-refresh-3",
            "expires_in": 300,
            "scope": "openid profile api1 offline_access",
        }

    async def _fake_resolve_user_profile_from_token(access_token: str, tenant_id: str, username_hint: str | None = None):
        assert access_token == "mobile-access-3"
        return None

    monkeypatch.setattr("app.main._call_token_endpoint", _fake_call_token_endpoint)
    monkeypatch.setattr("app.main._resolve_user_profile_from_token", _fake_resolve_user_profile_from_token)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/auth/mobile/refresh",
            json={
                "refresh_token": "refresh-abc",
                "tenant_id": "tenant-mobile",
                "oauth_client_id": "mobile-native",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["oauth_client_id"] == "mobile-native"


@pytest.mark.asyncio
async def test_proxy_forwards_query_string(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/catalog/products",
            params={"category": "phones"},
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-mobile",
            },
        )

    assert response.status_code == 200
    assert calls[0]["url"] == "http://catalog.api:8080/products?category=phones"


@pytest.mark.asyncio
async def test_proxy_injects_current_user_into_order_list(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)

    async def _fake_resolve_current_user_profile(_authorization: str, _tenant_id: str, _session=None):
        return {
            "id": "22222222-2222-2222-2222-222222222222",
            "userName": "user1",
            "tenantId": "tenant-a",
        }

    monkeypatch.setattr("app.main._resolve_current_user_profile", _fake_resolve_current_user_profile)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/order/orders",
            params={"userId": "should-be-overridden"},
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-a",
            },
        )

    assert response.status_code == 200
    assert calls[0]["url"] == "http://order.api:8080/orders"
    assert calls[0]["headers"]["X-User-Id"] == "22222222-2222-2222-2222-222222222222"


@pytest.mark.asyncio
async def test_proxy_injects_current_user_into_order_create(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)

    async def _fake_resolve_current_user_profile(_authorization: str, _tenant_id: str, _session=None):
        return {
            "id": "33333333-3333-3333-3333-333333333333",
            "userName": "user1",
            "tenantId": "tenant-a",
        }

    monkeypatch.setattr("app.main._resolve_current_user_profile", _fake_resolve_current_user_profile)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.post(
            "/api/v1/order/orders",
            json={
                "userId": "should-be-overridden",
                "items": [{"productName": "Phone", "price": 100}],
                "total": 100,
            },
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-a",
            },
        )

    assert response.status_code == 200
    forwarded = json.loads(calls[0]["content"].decode("utf-8"))
    assert "userId" not in forwarded
    assert calls[0]["headers"]["X-User-Id"] == "33333333-3333-3333-3333-333333333333"


@pytest.mark.asyncio
async def test_proxy_injects_current_user_header_into_order_detail(monkeypatch):
    calls: list[dict] = []
    _patch_upstream(monkeypatch, calls)

    async def _fake_resolve_current_user_profile(_authorization: str, _tenant_id: str, _session=None):
        return {
            "id": "55555555-5555-5555-5555-555555555555",
            "userName": "user1",
            "tenantId": "tenant-a",
        }

    monkeypatch.setattr("app.main._resolve_current_user_profile", _fake_resolve_current_user_profile)

    async with AsyncClient(app=app, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/order/orders/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            headers={
                "Authorization": "Bearer mobile-token",
                "X-Tenant-Id": "tenant-a",
            },
        )

    assert response.status_code == 200
    assert calls[0]["url"] == "http://order.api:8080/orders/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    assert calls[0]["headers"]["X-User-Id"] == "55555555-5555-5555-5555-555555555555"
